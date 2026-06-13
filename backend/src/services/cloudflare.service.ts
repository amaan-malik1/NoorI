import { cfFetch, getCFClient } from '../config/cloudflare.js'
import { encrypt } from '../utils/encryption.js'
import { prisma } from '../config/database.js'

// ─── Types ────────────────────────────────────────────────

interface CFAccount {
  id: string
  name: string
}

interface CFTokenStatus {
  id: string
  status: 'active' | 'disabled' | 'expired'
}

interface CFGatewayLocation {
  id: string
  name: string
  doh_subdomain: string
}

interface CFGatewayPolicy {
  id: string
  name: string
  action: 'block' | 'allow'
  traffic: string
  enabled: boolean
}

// ─── Step 1: Verify global API key + get accounts ─────────

export async function verifyAndGetAccounts(
  email: string,
  globalKey: string
): Promise<CFAccount[]> {
  // Use global key ONLY here — immediately discarded after this call
  const res = await cfFetch<CFAccount[]>(
    globalKey,
    '/accounts',
    {
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': globalKey,
        Authorization: '', // override — global key uses email+key headers
      },
    }
  )

  return res.result
}

// ─── Step 2: Create scoped token ──────────────────────────

/**
 * Creates a Zero Trust scoped token from a global key.
 * The global key is used ONCE here and never stored.
 */
export async function createScopedToken(
  email: string,
  globalKey: string,
  cfAccountId: string
): Promise<string> {

  const groups = await cfFetch<any[]>(
    globalKey,
    '/user/tokens/permission_groups',
    {
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': globalKey,
        Authorization: '',
      },
    }
  )



  const body = {
    name: `Noori Gateway Token - ${new Date().toISOString()}`,
    policies: [
      {
        effect: 'allow',
        resources: {
          [`com.cloudflare.api.account.${cfAccountId}`]: '*',
        },
        permission_groups: [
          { id: '3f376c8e6f764a938b848bd01c8995c4' }, // Zero Trust Read
          { id: 'b33f02c6f7284e05a6f20741c0bb0567' }, // Zero Trust Write
          { id: 'c1fde68c7bcc44588cbb6ddbc16d6480' }, // Account Settings Read
        ],
      },
    ],
    condition: {
      request_ip: { not_in: [] },
    },
  }


  const res = await cfFetch<{ value: string }>(
    globalKey,
    '/user/tokens',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'X-Auth-Email': email,
        'X-Auth-Key': globalKey,
        Authorization: '',
      },
    }
  )

  // value is only returned on creation — store it immediately
  return res.result.value
}

// ─── Step 3: Verify scoped token works ───────────────────

export async function verifyScopedToken(token: string): Promise<CFTokenStatus> {
  const res = await cfFetch<CFTokenStatus>(token, '/user/tokens/verify')
  return res.result
}

// ─── Step 4: Get or create Gateway location ───────────────

export async function getOrCreateGatewayLocation(
  token: string,
  cfAccountId: string,
  accountId: string
): Promise<CFGatewayLocation> {
  // List existing locations
  const listRes = await cfFetch<CFGatewayLocation[]>(
    token,
    `/accounts/${cfAccountId}/gateway/locations`
  )

  // Reuse existing Noori location if found
  const existing = listRes.result?.find(l => l.name.startsWith('Noori'))
  if (existing) return existing

  // Create new location
  const createRes = await cfFetch<CFGatewayLocation>(
    token,
    `/accounts/${cfAccountId}/gateway/locations`,
    {
      method: 'POST',
      body: JSON.stringify({ name: 'Noori Default Location' }),
    },
    accountId
  )

  return createRes.result
}

/// step 5
// ─── Step 5: Get Zero Trust team name ─────────────────────

export async function getTeamName(
  token: string,
  cfAccountId: string
): Promise<string | null> {
  try {
    const res = await cfFetch<{ auth_domain?: string }>(
      token,
      `/accounts/${cfAccountId}/access/organizations`
    )
    const authDomain = res.result?.auth_domain
    if (!authDomain) return null
    // auth_domain looks like "noori-aman.cloudflareaccess.com"
    // team name is just the subdomain part
    return authDomain.split('.')[0]
  } catch {
    // Org may not be set up yet — not fatal, user can set it up later
    return null
  }
}

// ─── Connect account (full wizard flow) ──────────────────

export async function connectCloudflareAccount(
  accountId: string,
  email: string,
  globalKey: string,
  cfAccountId: string
): Promise<{ teamNameFound: boolean }> {
  const scopedToken = await createScopedToken(email, globalKey, cfAccountId)
  await verifyScopedToken(scopedToken)

  const location = await getOrCreateGatewayLocation(scopedToken, cfAccountId, accountId)
  const teamName = await getTeamName(scopedToken, cfAccountId)

  const encryptedToken = encrypt(scopedToken)

  await prisma.account.update({
    where: { id: accountId },
    data: {
      cfConnected: true,
      cfAccountId,
      cfAccountEmail: email,
      cloudflareToken: encryptedToken,
      cfGatewayId: location.id,
      cfTeamName: teamName,
      lastSyncAt: new Date(),
    },
  })

  return { teamNameFound: !!teamName }
}

// ─── Disconnect ───────────────────────────────────────────

export async function disconnectCloudflareAccount(accountId: string): Promise<void> {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      cfConnected: false,
      cfAccountId: null,
      cfAccountEmail: null,
      cloudflareToken: null,
      cfGatewayId: null,
      lastSyncAt: null,
    },
  })
}

// ─── Policy CRUD ──────────────────────────────────────────

/**
 * Builds the Cloudflare Gateway traffic expression string
 * from an array of category IDs + domain lists.
 */
function buildTrafficExpression(
  blockedCategories: number[],
  blockedDomains: string[]
): string {
  const parts: string[] = []

  if (blockedCategories.length > 0) {
    parts.push(`any(dns.content_category[*] in {${blockedCategories.join(' ')}})`)
  }

  if (blockedDomains.length > 0) {
    const domainList = blockedDomains.map(d => `"${d}"`).join(' ')
    parts.push(`any(dns.domains[*] in {${domainList}})`)
  }

  return parts.join(' or ') || 'false'
}

export async function pushPolicyToCloudflare(
  accountId: string,
  policyId: string
): Promise<void> {
  const cf = await getCFClient(accountId)

  const policy = await prisma.contentPolicy.findUnique({
    where: { id: policyId },
    select: {
      cfPolicyId: true,
      name: true,
      blockedCategories: true,
      blockedDomains: true,
      allowedDomains: true,
      safeSearchEnabled: true,
      isActive: true,
    },
  })

  if (!policy) throw new Error('Policy not found')

  const traffic = buildTrafficExpression(
    policy.blockedCategories,
    policy.blockedDomains
  )

  const body = {
    name: policy.name,
    action: 'block',
    traffic,
    enabled: policy.isActive,
    filters: ['dns'],
  }

  let cfPolicyId = policy.cfPolicyId

  if (cfPolicyId) {
    // Update existing
    await cf.fetch(
      `/accounts/${cf.cfAccountId}/gateway/rules/${cfPolicyId}`,
      { method: 'PUT', body: JSON.stringify(body) }
    )
  } else {
    // Create new
    const res = await cf.fetch<CFGatewayPolicy>(
      `/accounts/${cf.cfAccountId}/gateway/rules`,
      { method: 'POST', body: JSON.stringify(body) }
    )
    cfPolicyId = res.result.id

    await prisma.contentPolicy.update({
      where: { id: policyId },
      data: { cfPolicyId },
    })
  }
}

export async function deletePolicyFromCloudflare(
  accountId: string,
  cfPolicyId: string
): Promise<void> {
  const cf = await getCFClient(accountId)
  await cf.fetch(
    `/accounts/${cf.cfAccountId}/gateway/rules/${cfPolicyId}`,
    { method: 'DELETE' }
  )
}

// ─── SafeSearch ───────────────────────────────────────────

export async function setSafeSearch(
  accountId: string,
  enabled: boolean
): Promise<void> {
  const cf = await getCFClient(accountId)

  await cf.fetch(
    `/accounts/${cf.cfAccountId}/gateway/configurations`,
    {
      method: 'PUT',
      body: JSON.stringify({
        settings: {
          browser_isolation: { url_browser_isolation_enabled: false },
          body_scanning: { inspection_mode: 'deep' },
          antivirus: { enabled_download_phase: enabled },
          // SafeSearch enforcement
          extended_email_matching: { enabled },
        },
      }),
    }
  )
}

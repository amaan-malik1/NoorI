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
  const body = {
    name: `NoorI Gateway Token - ${new Date().toISOString()}`,
    policies: [
      {
        effect: 'allow',
        resources: {
          [`com.cloudflare.api.account.${cfAccountId}`]: '*',
        },
        permission_groups: [
          { id: 'e086da7e2179491d842aea368d72607d' }, // Zero Trust Read
          { id: '4a4a1a7a4e6b4a5a4a4a1a7a4e6b4a5a' }, // Zero Trust Write
          { id: 'c1ffa8ca34df4a4291f5e7d5c2bdcbba' }, // Account Settings Read
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

  // Reuse existing NoorI location if found
  const existing = listRes.result?.find(l => l.name.startsWith('NoorI'))
  if (existing) return existing

  // Create new location
  const createRes = await cfFetch<CFGatewayLocation>(
    token,
    `/accounts/${cfAccountId}/gateway/locations`,
    {
      method: 'POST',
      body: JSON.stringify({ name: 'NoorI Default Location' }),
    },
    accountId
  )

  return createRes.result
}

// ─── Step 5: Get Zero Trust team name ────────────────────

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
    // auth_domain = "your-name.cloudflareaccess.com" → return "your-name"
    return authDomain.split('.')[0]
  } catch {
    return null
  }
}

// ─── Step 6: Create WARP device enrollment policy ────────
// Without this, users authenticate but get blocked by Zero Trust
// because no policy says they're allowed to enroll devices.
// We create a permissive "allow everyone" rule automatically.

export async function ensureWARPEnrollmentPolicy(
  token: string,
  cfAccountId: string
): Promise<void> {
  try {
    // Check if a device enrollment policy already exists
    const existing = await cfFetch<{ id: string; name: string }[]>(
      token,
      `/accounts/${cfAccountId}/devices/policy`
    )

    // If any policy exists already, don't create another
    if (existing.result && Array.isArray(existing.result) && existing.result.length > 0) {
      return
    }
  } catch {
    // Endpoint returned error — may not exist yet, proceed to create
  }

  try {
    await cfFetch(
      token,
      `/accounts/${cfAccountId}/devices/policy`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'NoorI Default Enrollment Policy',
          description: 'Auto-created by NoorI — allows all authenticated users to enroll devices',
          precedence: 100,
          default: true,
          match: 'identity.email != ""', // any authenticated user
          enabled: true,
        }),
      }
    )
  } catch (err) {
    // Non-fatal — user can add this manually if API rejects
    console.warn('Could not auto-create WARP enrollment policy:', err)
  }
}

// ─── Connect account (full wizard flow) ──────────────────

export async function connectCloudflareAccount(
  accountId: string,
  email: string,
  globalKey: string,
  cfAccountId: string
): Promise<{ teamNameFound: boolean }> {
  // 1. Create scoped token (global key used here only)
  const scopedToken = await createScopedToken(email, globalKey, cfAccountId)
  // globalKey is now out of scope — never stored

  // 2. Verify the scoped token works
  await verifyScopedToken(scopedToken)

  // 3. Get/create Gateway location
  const location = await getOrCreateGatewayLocation(
    scopedToken,
    cfAccountId,
    accountId
  )

  // 4. Fetch Zero Trust team name (subdomain users need for WARP login)
  const teamName = await getTeamName(scopedToken, cfAccountId)

  // 5. Ensure a WARP enrollment policy exists so users can connect devices
  //    This is the step most people miss when setting up Zero Trust manually.
  await ensureWARPEnrollmentPolicy(scopedToken, cfAccountId)

  // 6. Encrypt and store scoped token
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

  // If we don't have a cfPolicyId stored, check if a rule with
  // this name already exists in Cloudflare (handles the case where
  // a previous push created the rule but failed to save the ID to DB)
  if (!cfPolicyId) {
    try {
      const existing = await cf.fetch<CFGatewayPolicy[]>(
        `/accounts/${cf.cfAccountId}/gateway/rules`
      )
      const match = existing.result?.find(r => r.name === policy.name)
      if (match) {
        console.log(`[CF Policy Push] Found existing rule by name: ${match.id}`)
        cfPolicyId = match.id
        // Persist the recovered ID so we don't hit this path again
        await prisma.contentPolicy.update({
          where: { id: policyId },
          data: { cfPolicyId },
        })
      }
    } catch (err) {
      console.warn('[CF Policy Push] Could not list existing rules:', err)
    }
  }

  if (cfPolicyId) {
    // Update existing rule
    console.log(`[CF Policy Push] Updating rule: ${cfPolicyId}`)
    await cf.fetch(
      `/accounts/${cf.cfAccountId}/gateway/rules/${cfPolicyId}`,
      { method: 'PUT', body: JSON.stringify(body) }
    )
  } else {
    // Create new rule
    console.log(`[CF Policy Push] Creating new gateway rule...`)
    const res = await cf.fetch<CFGatewayPolicy>(
      `/accounts/${cf.cfAccountId}/gateway/rules`,
      { method: 'POST', body: JSON.stringify(body) }
    )
    cfPolicyId = res.result.id
    console.log(`[CF Policy Push] Created rule ID: ${cfPolicyId}`)

    await prisma.contentPolicy.update({
      where: { id: policyId },
      data: { cfPolicyId },
    })
  }

  console.log(`[CF Policy Push] ✅ Success`)
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
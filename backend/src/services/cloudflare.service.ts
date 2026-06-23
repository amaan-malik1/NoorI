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
  // Raw fetch — cfFetch always injects Bearer which overrides X-Auth-Key auth
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': email,
      'X-Auth-Key': globalKey,
    },
  })
  const data = await res.json() as { success: boolean; result: CFAccount[]; errors: { message: string }[] }
  if (!data.success) throw new Error(data.errors?.[0]?.message ?? 'Failed to fetch accounts')
  return data.result
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
  const headers = {
    'Content-Type': 'application/json',
    'X-Auth-Email': email,
    'X-Auth-Key': globalKey,
  }

  // Step A — fetch real permission group IDs for this account.
  // These IDs are account-specific and cannot be hardcoded.
  const pgRes = await fetch(
    `https://api.cloudflare.com/client/v4/user/tokens/permission_groups`,
    { headers }
  )
  const pgData = await pgRes.json() as {
    success: boolean
    result: { id: string; name: string; scopes: string[] }[]
  }

  if (!pgData.success || !pgData.result?.length) {
    throw new Error('Could not fetch Cloudflare permission groups')
  }

  // Find the three groups we need by name (names are stable across accounts)
  const find = (name: string) => pgData.result.find(g => g.name === name)?.id

  const ztReadId = find('Zero Trust Read')
  const ztWriteId = find('Zero Trust Write')
  const acctReadId = find('Account Settings Read')

  console.log('[CF Connect] Permission group IDs:', { ztReadId, ztWriteId, acctReadId })

  if (!ztReadId || !ztWriteId || !acctReadId) {
    // Log all available groups so we can debug name mismatches
    console.error('[CF Connect] Available groups:', pgData.result.map(g => g.name))
    throw new Error(
      'Could not find required Cloudflare permission groups. ' +
      'Check backend logs for available group names.'
    )
  }

  // Step B — create the scoped token using the real IDs
  const body = {
    name: `NoorI Gateway Token - ${new Date().toISOString()}`,
    policies: [
      {
        effect: 'allow',
        resources: {
          [`com.cloudflare.api.account.${cfAccountId}`]: '*',
        },
        permission_groups: [
          { id: ztReadId },
          { id: ztWriteId },
          { id: acctReadId },
        ],
      },
    ],
  }

  console.log(`[CF Connect] Creating scoped token for account: ${cfAccountId}`)

  const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await res.json() as {
    success: boolean
    result: { value: string }
    errors: { message: string }[]
  }

  if (!data.success) {
    console.error('[CF Connect] Token creation raw response:', JSON.stringify(data, null, 2))
    throw new Error(data.errors?.[0]?.message ?? 'Token creation failed')
  }

  console.log('[CF Connect] Token created successfully')
  return data.result.value
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
  let listRes: Awaited<ReturnType<typeof cfFetch<CFGatewayLocation[]>>>
  try {
    listRes = await cfFetch<CFGatewayLocation[]>(
      token,
      `/accounts/${cfAccountId}/gateway/locations`
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('account') || msg.toLowerCase().includes('initialized')) {
      throw new Error(
        'Zero Trust has not been activated on this Cloudflare account. ' +
        'Please visit one.dash.cloudflare.com, log in, and complete the Zero Trust onboarding (takes ~30 seconds). Then try connecting again.'
      )
    }
    throw err
  }

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

// ─── Step 7: Enable Gateway with WARP filtering mode ─────
// Without this setting, Cloudflare One app connects but routes
// traffic as plain WARP (consumer product) instead of through
// Zero Trust Gateway — so no blocking rules apply.

export async function enableGatewayFiltering(
  token: string,
  cfAccountId: string
): Promise<void> {
  try {
    // Set the default device settings to use Gateway proxy mode
    // This is what makes warp=on AND gateway=on in the trace
    await cfFetch(
      token,
      `/accounts/${cfAccountId}/devices/policy/settings`,
      {
        method: 'PUT',
        body: JSON.stringify({
          gateway_proxy_enabled: true,
          gateway_unique_id: cfAccountId,
          root_certificate_installation_enabled: false,
          use_zt_virtual_ip: false,
        }),
      }
    )
    console.log('[CF Setup] ✅ Gateway filtering mode enabled')
  } catch (err) {
    // Non-fatal — user can enable this manually in Zero Trust settings
    console.warn('[CF Setup] Could not enable gateway filtering mode:', err)
  }
}

// ─── Connect account (full wizard flow) ──────────────────

export async function connectCloudflareAccount(
  accountId: string,
  email: string,
  globalKey: string,
  cfAccountId: string
): Promise<{ teamNameFound: boolean }> {
  // 1. Create scoped token
  const scopedToken = await createScopedToken(email, globalKey, cfAccountId)

  // 2. Verify token
  console.log('[CF Connect] Step 2: verifying token...')
  await verifyScopedToken(scopedToken)
  console.log('[CF Connect] Step 2: token verified')

  // 3. Get/create Gateway location
  console.log('[CF Connect] Step 3: getting gateway location...')
  const location = await getOrCreateGatewayLocation(scopedToken, cfAccountId, accountId)
  console.log('[CF Connect] Step 3: location id =', location.id)

  // 4. Team name
  console.log('[CF Connect] Step 4: getting team name...')
  const teamName = await getTeamName(scopedToken, cfAccountId)
  console.log('[CF Connect] Step 4: teamName =', teamName)

  // 5. WARP enrollment policy
  console.log('[CF Connect] Step 5: ensuring WARP enrollment policy...')
  await ensureWARPEnrollmentPolicy(scopedToken, cfAccountId)
  console.log('[CF Connect] Step 5: done')

  // 6. Gateway filtering
  console.log('[CF Connect] Step 6: enabling gateway filtering...')
  await enableGatewayFiltering(scopedToken, cfAccountId)
  console.log('[CF Connect] Step 6: done')

  // 7. Save
  console.log('[CF Connect] Step 7: saving to DB...')
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
  console.log('[CF Connect] ✅ All steps complete')

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
      schedule: true,
    },
  })

  if (!policy) throw new Error('Policy not found')

  const traffic = buildTrafficExpression(
    policy.blockedCategories,
    policy.blockedDomains
  )

  const body: Record<string, unknown> = {
    name: policy.name,
    action: 'block',
    traffic,
    enabled: policy.isActive,
    filters: ['dns'],
  }

  // Attach Cloudflare-native schedule if one is set — Cloudflare's own
  // edge handles activating/deactivating the rule at the right times,
  // no background worker needed on our end.
  if (policy.schedule) {
    const { toCloudflareSchedule } = await import('../types/schedule.types.js')
    body.schedule = toCloudflareSchedule(policy.schedule as never)
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
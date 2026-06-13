import { prisma } from './database.js'
import { decrypt } from '../utils/encryption.js'

const CF_BASE = 'https://api.cloudflare.com/client/v4'

// ─── Types ────────────────────────────────────────────────

export interface CFResponse<T> {
  result: T
  success: boolean
  errors: { code: number; message: string }[]
  messages: string[]
}

// ─── Sleep helper ─────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Core fetch wrapper ───────────────────────────────────

/**
 * Makes a request to the Cloudflare API using a decrypted scoped token.
 * Automatically retries on rate limit (1200 req/5min).
 * Marks account as disconnected on auth errors.
 */
export async function cfFetch<T>(
  token: string,
  path: string,
  options: RequestInit = {},
  accountId?: string,
  retries = 3
): Promise<CFResponse<T>> {
  const url = `${CF_BASE}${path}`

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    // Rate limited — back off and retry
    if (res.status === 429) {
      const waitMs = 5000 * (attempt + 1)
      console.warn(`CF rate limited. Retrying in ${waitMs}ms...`)
      await sleep(waitMs)
      continue
    }

    const data = (await res.json()) as CFResponse<T>

    // Auth error — mark account as disconnected
    if (!data.success) {
      const isAuthError = data.errors?.some(
        e => e.code === 10000 || e.message?.toLowerCase().includes('authentication')
      )

      if (isAuthError && accountId) {
        await prisma.account.update({
          where: { id: accountId },
          data: { cfConnected: false },
        })
        throw new Error(
          'Cloudflare token expired or invalid. Please reconnect your account.'
        )
      }

      const errMsg = data.errors?.[0]?.message ?? 'Cloudflare API error'
      throw new Error(errMsg)
    }

    return data
  }

  throw new Error('Cloudflare API: max retries exceeded')
}

/**
 * Gets the decrypted CF token for an account and returns a
 * pre-bound fetch function so callers don't handle decryption.
 */
export async function getCFClient(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      cloudflareToken: true,
      cfAccountId: true,
      cfGatewayId: true,
      cfConnected: true,
    },
  })

  if (!account?.cloudflareToken || !account.cfConnected) {
    throw new Error('Cloudflare account not connected')
  }

  const token = decrypt(account.cloudflareToken)

  return {
    token,
    cfAccountId: account.cfAccountId!,
    cfGatewayId: account.cfGatewayId,
    fetch: <T>(path: string, options?: RequestInit) =>
      cfFetch<T>(token, path, options, accountId),
  }
}

import { prisma } from '../config/database.js'
import { getCFClient } from '../config/cloudflare.js'
import { ActivityAction } from '@prisma/client'

// ─── CF Gateway log entry shape ───────────────────────────

interface CFGatewayLog {
  QueryName: string           // domain queried
  QueryType: string           // A, AAAA, CNAME etc
  BlockedFileType: string
  Action: 'block' | 'allow' | 'override'
  Datetime: string            // ISO timestamp
  DeviceID: string
  PolicyID?: string
  CategoryIDs?: number[]
  // Unique log ID from CF
  QueryID?: string
}

// ─── Main sync function ───────────────────────────────────

export async function syncLogsForAccount(accountId: string): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      cfAccountId: true,
      lastSyncAt: true,
      cfConnected: true,
      subscription: { select: { plan: true } },
    },
  })

  if (!account?.cfConnected || !account.cfAccountId) return

  let cf
  try {
    cf = await getCFClient(accountId)
  } catch {
    // Token expired or disconnected — already handled inside getCFClient
    return
  }

  // CF Gateway logs are only available for last 24h on free tier
  const since = account.lastSyncAt
    ? account.lastSyncAt.toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const until = new Date().toISOString()

  // Pull logs from CF Gateway
  let logs: CFGatewayLog[] = []
  try {
    const res = await cf.fetch<CFGatewayLog[]>(
      `/accounts/${cf.cfAccountId}/gateway/logging/received?start=${since}&end=${until}&limit=1000`
    )
    logs = res.result ?? []
  } catch (err) {
    console.error(`CF log pull failed for account ${accountId}:`, err)
    return
  }

  if (logs.length === 0) {
    await prisma.account.update({
      where: { id: accountId },
      data: { lastSyncAt: new Date() },
    })
    return
  }

  // Map CF action → our enum
  function mapAction(action: string): ActivityAction {
    if (action === 'block') return 'blocked'
    if (action === 'override') return 'overridden'
    return 'allowed'
  }

  // Build insert data, skip entries without a domain
  const insertData = logs
    .filter(log => !!log.QueryName)
    .map(log => ({
      accountId,
      domain: log.QueryName.replace(/\.$/, ''), // strip trailing dot
      action: mapAction(log.Action),
      categoryId: log.CategoryIDs?.[0] ?? null,
      policyId: log.PolicyID ?? null,
      cfLogId: log.QueryID ?? null,
      timestamp: new Date(log.Datetime),
    }))

  if (insertData.length === 0) return

  // Bulk insert — skip duplicates via cfLogId unique constraint
  // Process in batches of 100 to avoid giant single queries
  const BATCH_SIZE = 100
  for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
    const batch = insertData.slice(i, i + BATCH_SIZE)
    await prisma.activityLog.createMany({
      data: batch,
      skipDuplicates: true, // dedup by cfLogId
    })
  }

  // Update lastSyncAt
  await prisma.account.update({
    where: { id: accountId },
    data: { lastSyncAt: new Date() },
  })

  console.log(`📥  Synced ${insertData.length} logs for account ${accountId}`)
}

// ─── Pruning job (run daily via scheduler) ────────────────

export async function pruneOldLogs(): Promise<void> {
  // Free users: 30 day retention
  const freeDeleted = await prisma.activityLog.deleteMany({
    where: {
      timestamp: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      account: { subscription: { plan: 'free' } },
    },
  })

  // Pro users: 90 day retention
  const proDeleted = await prisma.activityLog.deleteMany({
    where: {
      timestamp: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      account: { subscription: { plan: 'pro' } },
    },
  })

  console.log(
    `🗑️  Pruned logs: ${freeDeleted.count} free + ${proDeleted.count} pro`
  )
}

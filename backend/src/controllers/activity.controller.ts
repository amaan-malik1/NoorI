import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { logSyncQueue } from '../workers/logSync.worker.js'
import { syncLogsForAccount } from '../services/logSync.service.js'

// ─── Helpers ──────────────────────────────────────────────

function getPeriodStart(period: string): Date {
  const now = new Date()
  switch (period) {
    case 'day':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}

function getPlanRetentionDays(plan: string): number {
  return plan === 'pro' ? 90 : 7 // free users can only see 7 days
}

// ─── GET /api/activity ────────────────────────────────────

export async function getActivityLogs(req: Request, res: Response) {
  const schema = z.object({
    period: z.enum(['day', 'week', 'month']).default('day'),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    action: z.enum(['allowed', 'blocked', 'overridden']).optional(),
    domain: z.string().optional(),
  })

  const { period, page, limit, action, domain } = schema.parse(req.query)

  // Plan gate — free users capped at 7 days history
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })

  const maxRetentionDays = getPlanRetentionDays(sub?.plan ?? 'free')
  const requestedStart = getPeriodStart(period)
  const minAllowedStart = new Date(
    Date.now() - maxRetentionDays * 24 * 60 * 60 * 1000
  )
  const since = requestedStart < minAllowedStart ? minAllowedStart : requestedStart

  const where = {
    accountId: req.user!.accountId,
    timestamp: { gte: since },
    ...(action && { action }),
    ...(domain && {
      domain: { contains: domain, mode: 'insensitive' as const },
    }),
  }

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        domain: true,
        action: true,
        categoryId: true,
        timestamp: true,
      },
    }),
    prisma.activityLog.count({ where }),
  ])

  return sendSuccess(res, {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      plan: sub?.plan ?? 'free',
      retentionDays: maxRetentionDays,
    },
  })
}

// ─── GET /api/activity/chart ──────────────────────────────

export async function getActivityChart(req: Request, res: Response) {
  const schema = z.object({
    period: z.enum(['day', 'week', 'month']).default('week'),
  })

  const { period } = schema.parse(req.query)

  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })

  const maxRetentionDays = getPlanRetentionDays(sub?.plan ?? 'free')
  const requestedStart = getPeriodStart(period)
  const minAllowedStart = new Date(
    Date.now() - maxRetentionDays * 24 * 60 * 60 * 1000
  )
  const since = requestedStart < minAllowedStart ? minAllowedStart : requestedStart

  // Bucket size based on period
  const bucketInterval =
    period === 'day' ? '1 hour' : period === 'week' ? '6 hours' : '1 day'

  // Raw SQL for time-bucket aggregation (Prisma doesn't support date_trunc natively)
  const buckets = await prisma.$queryRaw<
    { bucket: Date; action: string; count: bigint }[]
  >`
    SELECT
      date_trunc(${bucketInterval === '1 hour' ? 'hour' : bucketInterval === '6 hours' ? 'hour' : 'day'}, timestamp) AS bucket,
      action,
      COUNT(*) AS count
    FROM "ActivityLog"
    WHERE "accountId" = ${req.user!.accountId}
      AND timestamp >= ${since}
    GROUP BY bucket, action
    ORDER BY bucket ASC
  `

  // Normalize bigint to number for JSON serialization
  const normalized = buckets.map(b => ({
    bucket: b.bucket,
    action: b.action,
    count: Number(b.count),
  }))

  // Summary counts
  const summary = await prisma.activityLog.groupBy({
    by: ['action'],
    where: {
      accountId: req.user!.accountId,
      timestamp: { gte: since },
    },
    _count: { action: true },
  })

  const summaryMap = summary.reduce(
    (acc, s) => {
      acc[s.action] = s._count.action
      return acc
    },
    {} as Record<string, number>
  )

  return sendSuccess(res, {
    buckets: normalized,
    summary: {
      allowed: summaryMap['allowed'] ?? 0,
      blocked: summaryMap['blocked'] ?? 0,
      overridden: summaryMap['overridden'] ?? 0,
      total: Object.values(summaryMap).reduce((a, b) => a + b, 0),
    },
    period,
  })
}

// ─── GET /api/activity/stats ──────────────────────────────

export async function getActivityStats(req: Request, res: Response) {
  const since = getPeriodStart('day')

  const [topBlocked, topAllowed, recentBypass] = await Promise.all([
    // Top 10 blocked domains today
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        accountId: req.user!.accountId,
        action: 'blocked',
        timestamp: { gte: since },
      },
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 10,
    }),

    // Top 10 allowed domains today
    prisma.activityLog.groupBy({
      by: ['domain'],
      where: {
        accountId: req.user!.accountId,
        action: 'allowed',
        timestamp: { gte: since },
      },
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 10,
    }),

    // Recent bypass attempts (overridden)
    prisma.activityLog.findMany({
      where: {
        accountId: req.user!.accountId,
        action: 'overridden',
        timestamp: { gte: getPeriodStart('week') },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { domain: true, timestamp: true, categoryId: true },
    }),
  ])

  return sendSuccess(res, {
    topBlocked: topBlocked.map(d => ({
      domain: d.domain,
      count: d._count.domain,
    })),
    topAllowed: topAllowed.map(d => ({
      domain: d.domain,
      count: d._count.domain,
    })),
    recentBypass,
  })
}

// ─── POST /api/activity/sync ──────────────────────────────

export async function forceSync(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { cfConnected: true },
  })

  if (!account?.cfConnected) {
    return sendError(res, 'Cloudflare account not connected', { status: 400 })
  }

  // Add to queue with high priority
  await logSyncQueue.add(
    'sync',
    { accountId: req.user!.accountId },
    { jobId: `force-sync-${req.user!.accountId}-${Date.now()}`, priority: 1 }
  )

  return sendSuccess(res, null, {
    message: 'Sync queued. Logs will appear shortly.',
  })
}

// ─── GET /api/activity/export ─────────────────────────────

export async function exportActivityCSV(req: Request, res: Response) {
  const schema = z.object({
    period: z.enum(['day', 'week', 'month']).default('week'),
  })

  const { period } = schema.parse(req.query)

  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })

  const since = getPeriodStart(period)

  // Stream logs as CSV
  const logs = await prisma.activityLog.findMany({
    where: {
      accountId: req.user!.accountId,
      timestamp: { gte: since },
    },
    orderBy: { timestamp: 'desc' },
    select: {
      domain: true,
      action: true,
      categoryId: true,
      timestamp: true,
    },
  })

  const csvHeader = 'timestamp,domain,action,categoryId\n'
  const csvRows = logs
    .map(
      l =>
        `${l.timestamp.toISOString()},${l.domain},${l.action},${l.categoryId ?? ''}`
    )
    .join('\n')

  const csv = csvHeader + csvRows

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="Noori-activity-${period}-${Date.now()}.csv"`
  )

  return res.send(csv)
}

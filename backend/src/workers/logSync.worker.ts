import { Worker, Queue } from 'bullmq'
import { redis } from '../config/redis.js'
import { prisma } from '../config/database.js'
import { syncLogsForAccount } from '../services/logSync.service.js'
import { getPlanLimits } from '../config/plans.js'

// ─── Queue ────────────────────────────────────────────────

export const logSyncQueue = new Queue('log-sync', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

// ─── Schedule jobs for all connected accounts ─────────────

export async function scheduleAllAccountSyncs() {
  const accounts = await prisma.account.findMany({
    where: { cfConnected: true },
    select: {
      id: true,
      subscription: { select: { plan: true } },
    },
  })

  for (const account of accounts) {
    await logSyncQueue.add(
      'sync',
      { accountId: account.id },
      {
        // Deduplicate by accountId — won't add if job already queued
        jobId: `sync-${account.id}`,
      }
    )
  }

  console.log(`📋  Scheduled log sync for ${accounts.length} accounts`)
}

// ─── Schedule repeating jobs ──────────────────────────────
// Pro and Family both sync every 5 minutes (paid tiers).
// Free syncs every 30 minutes. Grouped as "fast" vs "slow"
// rather than one repeat job per plan, since the interval is
// shared across paid tiers.

export async function startLogSyncScheduler() {
  const fastIntervalMs = getPlanLimits('pro').logSyncIntervalMinutes * 60 * 1000
  const slowIntervalMs = getPlanLimits('free').logSyncIntervalMinutes * 60 * 1000

  // Paid accounts (pro + family): fast sync
  await logSyncQueue.add(
    'schedule-fast',
    { type: 'fast' },
    {
      jobId: 'scheduler-fast',
      repeat: { every: fastIntervalMs },
      removeOnComplete: 1,
    }
  )

  // Free accounts: slow sync
  await logSyncQueue.add(
    'schedule-slow',
    { type: 'slow' },
    {
      jobId: 'scheduler-slow',
      repeat: { every: slowIntervalMs },
      removeOnComplete: 1,
    }
  )

  console.log('⏰  Log sync scheduler started')
}

// ─── Worker ───────────────────────────────────────────────

export const logSyncWorker = new Worker(
  'log-sync',
  async (job) => {
    const { accountId, type } = job.data

    // Scheduler job — enqueue all accounts matching this speed tier
    if (type === 'fast' || type === 'slow') {
      const plans = type === 'fast' ? ['pro', 'family'] : ['free']
      const accounts = await prisma.account.findMany({
        where: {
          cfConnected: true,
          subscription: { plan: { in: plans as ('free' | 'pro' | 'family')[] } },
        },
        select: { id: true },
      })

      for (const account of accounts) {
        await logSyncQueue.add(
          'sync',
          { accountId: account.id },
          { jobId: `sync-${account.id}` }
        )
      }
      return
    }

    // Actual sync job
    if (accountId) {
      await syncLogsForAccount(accountId)
    }
  },
  {
    connection: redis,
    concurrency: 20,
    limiter: { max: 50, duration: 1000 },
  }
)

logSyncWorker.on('completed', (job) => {
  if (job.data.accountId) {
    console.log(`✅  Log sync completed for account ${job.data.accountId}`)
  }
})

logSyncWorker.on('failed', (job, err) => {
  console.error(`❌  Log sync failed for job ${job?.id}:`, err.message)
})
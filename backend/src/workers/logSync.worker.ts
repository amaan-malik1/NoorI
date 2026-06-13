import { Worker, Queue, QueueScheduler } from 'bullmq'
import { redis } from '../config/redis.js'
import { prisma } from '../config/database.js'
import { syncLogsForAccount } from '../services/logSync.service.js'

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
    const isPro = account.subscription?.plan === 'pro'

    await logSyncQueue.add(
      'sync',
      { accountId: account.id },
      {
        // Deduplicate by accountId — won't add if job already queued
        jobId: `sync-${account.id}`,
        // Pro syncs every 5min, free every 15min
        delay: isPro ? 0 : 0, // delay handled by scheduler repeat
      }
    )
  }

  console.log(`📋  Scheduled log sync for ${accounts.length} accounts`)
}

// ─── Schedule repeating jobs ──────────────────────────────

export async function startLogSyncScheduler() {
  // Pro accounts: every 5 minutes
  await logSyncQueue.add(
    'schedule-pro',
    { type: 'pro' },
    {
      jobId: 'scheduler-pro',
      repeat: { every: 5 * 60 * 1000 },
      removeOnComplete: 1,
    }
  )

  // Free accounts: every 15 minutes
  await logSyncQueue.add(
    'schedule-free',
    { type: 'free' },
    {
      jobId: 'scheduler-free',
      repeat: { every: 15 * 60 * 1000 },
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

    // Scheduler job — enqueue all accounts of that plan type
    if (type === 'pro' || type === 'free') {
      const accounts = await prisma.account.findMany({
        where: {
          cfConnected: true,
          subscription: { plan: type === 'pro' ? 'pro' : 'free' },
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

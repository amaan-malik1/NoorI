import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { getPlanLimits, BASIC_PRESET_CATEGORIES } from '../config/plans.js'

import {
  connectCloudflareAccount,
  disconnectCloudflareAccount,
  pushPolicyToCloudflare,
  deletePolicyFromCloudflare,
  verifyAndGetAccounts,
  ensureWARPEnrollmentPolicy,
  enableGatewayFiltering,
  getTeamName,
} from '../services/cloudflare.service.js'
// ─── GET /api/cloudflare/status ───────────────────────────

export async function getCFStatus(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: {
      cfConnected: true,
      cfAccountEmail: true,
      cfAccountId: true,
      cfGatewayId: true,
      cfTeamName: true,
      lastSyncAt: true,
    },
  })

  if (!account) return sendError(res, 'Account not found', { status: 404 })

  return sendSuccess(res, account)
}

// ─── POST /api/cloudflare/verify ─────────────────────────
// Wizard step 1 — verify global key, return list of CF accounts

export async function verifyCFCredentials(req: Request, res: Response) {
  const schema = z.object({
    email: z.string().email('Invalid email'),
    globalKey: z.string().min(30, 'Invalid Global API Key'),
  })

  const { email, globalKey } = schema.parse(req.body)

  // This call uses the global key ONLY to list accounts
  // The key is never stored — it lives in memory for this request only
  const accounts = await verifyAndGetAccounts(email, globalKey)

  return sendSuccess(res, { accounts })
}

// ─── POST /api/cloudflare/connect ────────────────────────
// Wizard step 2 — user picks an account, we create scoped token

export async function connectCF(req: Request, res: Response) {
  const schema = z.object({
    email: z.string().email(),
    globalKey: z.string().min(30),
    cfAccountId: z.string().min(1, 'Cloudflare account ID is required'),
  })

  const { email, globalKey, cfAccountId } = schema.parse(req.body)

  // Check not already connected
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { cfConnected: true },
  })

  if (account?.cfConnected) {
    return sendError(res, 'Already connected. Disconnect first to reconnect.', {
      status: 409,
    })
  }

  const { teamNameFound } = await connectCloudflareAccount(
    req.user!.accountId,
    email,
    globalKey,
    cfAccountId
  )

  return sendSuccess(res, { teamNameFound }, {
    message: 'Cloudflare account connected successfully',
    status: 201,
  })
}

// POST /api/cloudflare/repair

export async function repairCFConnection(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: {
      cfConnected: true,
      cfAccountId: true,
      cloudflareToken: true,
    },
  })

  if (!account?.cfConnected || !account.cfAccountId || !account.cloudflareToken) {
    return sendError(res, 'No Cloudflare account connected', { status: 400 })
  }

  const { decrypt } = await import('../utils/encryption.js')
  const token = decrypt(account.cloudflareToken)

  const results = {
    enrollmentPolicy: false,
    gatewayFiltering: false,
    teamName: false,
  }

  // Re-run setup steps using stored scoped token
  try {
    await ensureWARPEnrollmentPolicy(token, account.cfAccountId)
    results.enrollmentPolicy = true
  } catch (err) {
    console.warn('[Repair] Enrollment policy:', err)
  }

  try {
    await enableGatewayFiltering(token, account.cfAccountId)
    results.gatewayFiltering = true
  } catch (err) {
    console.warn('[Repair] Gateway filtering:', err)
  }

  try {
    const teamName = await getTeamName(token, account.cfAccountId)
    if (teamName) {
      await prisma.account.update({
        where: { id: req.user!.accountId },
        data: { cfTeamName: teamName },
      })
      results.teamName = true
    }
  } catch (err) {
    console.warn('[Repair] Team name:', err)
  }

  return sendSuccess(res, { results }, {
    message: 'Connection repaired successfully',
  })
}

export async function disconnectCF(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { cfConnected: true },
  })

  if (!account?.cfConnected) {
    return sendError(res, 'No Cloudflare account connected', { status: 400 })
  }

  await disconnectCloudflareAccount(req.user!.accountId)

  return sendSuccess(res, null, { message: 'Cloudflare account disconnected' })
}

// ─── GET /api/cloudflare/policies ────────────────────────

export async function getPolicies(req: Request, res: Response) {
  const policies = await prisma.contentPolicy.findMany({
    where: { accountId: req.user!.accountId },
    orderBy: { createdAt: 'desc' },
  })

  return sendSuccess(res, policies)
}

// ─── POST /api/cloudflare/policies ───────────────────────

export async function createOrUpdatePolicy(req: Request, res: Response) {
  const scheduleSchema = z.object({
    days: z.record(
      z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']),
      z.string()
    ),
    timeZone: z.string().optional(),
  })

  const schema = z.object({
    id: z.string().optional(), // if provided → update, else → create
    name: z.string().min(1).max(60).default('Default Policy'),
    blockedCategories: z.array(z.number().int()).default([]),
    blockedDomains: z.array(z.string()).default([]),
    allowedDomains: z.array(z.string()).default([]),
    safeSearchEnabled: z.boolean().default(false),
    isActive: z.boolean().default(true),
    schedule: scheduleSchema.nullable().optional(),
  })

  const body = schema.parse(req.body)

  // Fetch plan once — used for policy count gate, Basic-preset lock,
  // and scheduling feature gate
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })
  const limits = getPlanLimits(sub?.plan ?? 'free')

  // Plan gate — policy count limit (1 free / 3 pro / unlimited family)
  if (!body.id && limits.maxPolicies !== null) {
    const existing = await prisma.contentPolicy.count({
      where: { accountId: req.user!.accountId },
    })
    if (existing >= limits.maxPolicies) {
      return sendError(
        res,
        `Your ${limits.name} plan supports up to ${limits.maxPolicies} content polic${limits.maxPolicies === 1 ? 'y' : 'ies'}. Upgrade for more.`,
        { status: 402 }
      )
    }
  }

  // Free tier is locked to Basic preset categories only — reject any
  // category outside that fixed set, and silently strip custom domains
  // beyond what Basic allows (categories are the hard gate; domains
  // remain available per the free-tier feature list)
  if (limits.restrictedToBasicPreset) {
    const hasDisallowedCategory = body.blockedCategories.some(
      c => !BASIC_PRESET_CATEGORIES.includes(c)
    )
    if (hasDisallowedCategory) {
      return sendError(
        res,
        'Free plan is limited to the Basic preset (Adult Content, VPNs & Proxies, Malware, Phishing). Upgrade to Pro for full category control.',
        { status: 402 }
      )
    }
  }

  // Plan gate — scheduling is a Pro/Family feature
  if (body.schedule && !limits.policyScheduling) {
    return sendError(
      res,
      'Policy scheduling requires a Pro or Family subscription. Upgrade to set time-based rules.',
      { status: 402 }
    )
  }

  // Validate schedule shape (each day's value must be a valid HH:MM-HH:MM range)
  if (body.schedule) {
    const { isValidSchedule } = await import('../types/schedule.types.js')
    if (!isValidSchedule(body.schedule as never)) {
      return sendError(
        res,
        'Invalid schedule. Each day needs a valid time range (e.g. 09:00-17:00) with start before end.',
        { status: 422 }
      )
    }
  }

  let policy

  if (body.id) {
    // Verify ownership before update
    const existing = await prisma.contentPolicy.findFirst({
      where: { id: body.id, accountId: req.user!.accountId },
    })
    if (!existing) return sendError(res, 'Policy not found', { status: 404 })

    policy = await prisma.contentPolicy.update({
      where: { id: body.id },
      data: {
        name: body.name,
        blockedCategories: body.blockedCategories,
        blockedDomains: body.blockedDomains,
        allowedDomains: body.allowedDomains,
        safeSearchEnabled: body.safeSearchEnabled,
        isActive: body.isActive,
        schedule: body.schedule ?? Prisma.JsonNull,
      },
    })
  } else {
    policy = await prisma.contentPolicy.create({
      data: {
        accountId: req.user!.accountId,
        name: body.name,
        blockedCategories: body.blockedCategories,
        blockedDomains: body.blockedDomains,
        allowedDomains: body.allowedDomains,
        safeSearchEnabled: body.safeSearchEnabled,
        isActive: body.isActive,
        schedule: body.schedule ?? Prisma.JsonNull,
      },
    })
  }

  // Push to Cloudflare if account is connected
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { cfConnected: true },
  })

  if (account?.cfConnected) {
    try {
      await pushPolicyToCloudflare(req.user!.accountId, policy.id)
    } catch (err) {
      // Don't fail the request — policy is saved locally, CF push failed
      console.error('CF policy push failed:', err)
      return sendSuccess(res, policy, {
        message:
          'Policy saved locally but failed to sync with Cloudflare. It will retry on next sync.',
      })
    }
  }

  return sendSuccess(res, policy, {
    message: body.id ? 'Policy updated' : 'Policy created',
    status: body.id ? 200 : 201,
  })
}

// ─── DELETE /api/cloudflare/policies/:id ─────────────────

export async function deletePolicy(req: Request, res: Response) {
  const id = req.params.id as string

  const policy = await prisma.contentPolicy.findFirst({
    where: { id, accountId: req.user!.accountId },
    select: { id: true, cfPolicyId: true },
  })

  if (!policy) return sendError(res, 'Policy not found', { status: 404 })

  // Remove from Cloudflare first if it was pushed
  if (policy.cfPolicyId) {
    const account = await prisma.account.findUnique({
      where: { id: req.user!.accountId },
      select: { cfConnected: true },
    })

    if (account?.cfConnected) {
      try {
        await deletePolicyFromCloudflare(req.user!.accountId, policy.cfPolicyId)
      } catch (err) {
        console.error('CF policy delete failed:', err)
      }
    }
  }

  await prisma.contentPolicy.delete({ where: { id } })

  return sendSuccess(res, null, { message: 'Policy deleted' })
}
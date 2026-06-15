import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import {
  connectCloudflareAccount,
  disconnectCloudflareAccount,
  pushPolicyToCloudflare,
  deletePolicyFromCloudflare,
  verifyAndGetAccounts,
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

// ─── DELETE /api/cloudflare/disconnect ───────────────────

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
  const schema = z.object({
    id: z.string().optional(), // if provided → update, else → create
    name: z.string().min(1).max(60).default('Default Policy'),
    blockedCategories: z.array(z.number().int()).default([]),
    blockedDomains: z.array(z.string()).default([]),
    allowedDomains: z.array(z.string()).default([]),
    safeSearchEnabled: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })

  const body = schema.parse(req.body)

  // Plan gate — free users get 1 policy max
  if (!body.id) {
    const sub = await prisma.subscription.findUnique({
      where: { accountId: req.user!.accountId },
      select: { plan: true },
    })

    if (sub?.plan === 'free') {
      const existing = await prisma.contentPolicy.count({
        where: { accountId: req.user!.accountId },
      })
      if (existing >= 1) {
        return sendError(
          res,
          'Free plan supports 1 content policy. Upgrade to Pro for more.',
          { status: 402 }
        )
      }
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
  const { id } = req.params

  const policy = await prisma.contentPolicy.findFirst({
    where: {
      //@ts-ignore
      id,
      accountId: req.user!.accountId
    },
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

  await prisma.contentPolicy.delete({
    where: {
      //@ts-ignore
      id
    }
  })

  return sendSuccess(res, null, { message: 'Policy deleted' })
}

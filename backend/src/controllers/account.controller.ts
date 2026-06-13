import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'

// ─── GET /api/account ─────────────────────────────────────

export async function getAccount(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: {
      id: true,
      isLocked: true,
      lockoutEnabled: true,
      cfConnected: true,
      cfAccountEmail: true,
      cfGatewayId: true,
      lastSyncAt: true,
      createdAt: true,
      subscription: {
        select: { plan: true, currentPeriodEnd: true },
      },
      _count: {
        select: { policies: true, devices: true },
      },
    },
  })

  if (!account) return sendError(res, 'Account not found', { status: 404 })

  return sendSuccess(res, account)
}

// ─── GET /api/account/setup-progress ─────────────────────

export async function getSetupProgress(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: {
      cfConnected: true,
      lockPin: true,
      policies: { select: { id: true }, take: 1 },
      devices: { select: { id: true }, take: 1 },
    },
  })

  if (!account) return sendError(res, 'Account not found', { status: 404 })

  const steps = [
    {
      id: 'email_verified',
      label: 'Verify your email',
      completed: true, // user can't be here without verification
    },
    {
      id: 'cloudflare_connected',
      label: 'Connect Cloudflare account',
      completed: account.cfConnected,
    },
    {
      id: 'content_policy',
      label: 'Create a content policy',
      completed: account.policies.length > 0,
    },
    {
      id: 'device_setup',
      label: 'Set up a device',
      completed: account.devices.length > 0,
    },
    {
      id: 'profile_locked',
      label: 'Set a profile lock PIN',
      completed: !!account.lockPin,
    },
  ]

  const completedCount = steps.filter(s => s.completed).length

  return sendSuccess(res, {
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
  })
}

// ─── POST /api/account/pin ────────────────────────────────

export async function setPin(req: Request, res: Response) {
  const schema = z.object({
    pin: z
      .string()
      .min(4, 'PIN must be at least 4 digits')
      .max(8, 'PIN must be at most 8 digits')
      .regex(/^\d+$/, 'PIN must contain only numbers'),
    currentPin: z.string().optional(),
  })

  const { pin, currentPin } = schema.parse(req.body)

  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { lockPin: true },
  })

  if (!account) return sendError(res, 'Account not found', { status: 404 })

  // If PIN already exists, require current PIN to change it
  if (account.lockPin) {
    if (!currentPin) {
      return sendError(res, 'Current PIN is required to change PIN', { status: 400 })
    }
    const valid = await bcrypt.compare(currentPin, account.lockPin)
    if (!valid) return sendError(res, 'Current PIN is incorrect', { status: 400 })
  }

  const pinHash = await bcrypt.hash(pin, 12)

  await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { lockPin: pinHash },
  })

  return sendSuccess(res, null, { message: 'PIN set successfully' })
}

// ─── POST /api/account/lock ───────────────────────────────

export async function lockProfile(req: Request, res: Response) {
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { lockPin: true, lockoutEnabled: true },
  })

  if (!account?.lockPin) {
    return sendError(res, 'Set a PIN before locking your profile', { status: 400 })
  }

  await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { isLocked: true },
  })

  return sendSuccess(res, null, { message: 'Profile locked' })
}

// ─── POST /api/account/unlock ────────────────────────────

export async function unlockProfile(req: Request, res: Response) {
  const schema = z.object({
    pin: z.string().min(1, 'PIN is required'),
  })

  const { pin } = schema.parse(req.body)

  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { lockPin: true, isLocked: true },
  })

  if (!account) return sendError(res, 'Account not found', { status: 404 })

  if (!account.isLocked) {
    return sendSuccess(res, null, { message: 'Profile is already unlocked' })
  }

  if (!account.lockPin) {
    return sendError(res, 'No PIN set', { status: 400 })
  }

  const valid = await bcrypt.compare(pin, account.lockPin)
  if (!valid) return sendError(res, 'Incorrect PIN', { status: 401 })

  await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { isLocked: false },
  })

  return sendSuccess(res, null, { message: 'Profile unlocked' })
}

// ─── PATCH /api/account/locking-prefs ────────────────────

export async function updateLockingPrefs(req: Request, res: Response) {
  const schema = z.object({
    lockoutEnabled: z.boolean(),
  })

  const { lockoutEnabled } = schema.parse(req.body)

  await prisma.account.update({
    where: { id: req.user!.accountId },
    data: { lockoutEnabled },
  })

  return sendSuccess(res, null, {
    message: `Lockout ${lockoutEnabled ? 'enabled' : 'disabled'}`,
  })
}

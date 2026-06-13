import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { generateiOSConfig, generatemacOSConfig } from '../services/config.service.js'
import {
  defaultiOSRestrictions,
  defaultmacOSRestrictions,
  iOSRestrictions,
  macOSRestrictions,
} from '../types/device.types.js'

// Helper — get DoH config if CF connected
async function getDOHConfig(accountId: string) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { cfConnected: true, cfGatewayId: true },
  })

  if (!account?.cfConnected || !account.cfGatewayId) return undefined

  return {
    serverURL: `https://${account.cfGatewayId}.cloudflare-gateway.com/dns-query`,
    serverName: `${account.cfGatewayId}.cloudflare-gateway.com`,
  }
}

// Helper — plan check for Pro features
async function isPro(accountId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { accountId },
    select: { plan: true },
  })
  return sub?.plan === 'pro'
}

// ─── GET /api/config/ios/:deviceId ────────────────────────
// Stream iOS .mobileconfig directly (same as device download but via config route)

export async function downloadiOSConfig(req: Request, res: Response) {
  const pro = await isPro(req.user!.accountId)
  if (!pro) {
    return sendError(res, 'iOS Config Generator requires a Pro subscription', {
      status: 402,
    })
  }

  const device = await prisma.device.findFirst({
    where: {
      id: req.params.deviceId,
      accountId: req.user!.accountId,
      type: 'ios',
    },
    include: { config: true },
  })

  if (!device) return sendError(res, 'iOS device not found', { status: 404 })

  const doh = await getDOHConfig(req.user!.accountId)
  const restrictions = {
    ...defaultiOSRestrictions,
    ...((device.config?.restrictions ?? {}) as Partial<iOSRestrictions>),
  }

  const buffer = generateiOSConfig(
    req.user!.accountId,
    device.id,
    restrictions,
    doh
  )

  const filename = `Noori-ios-${device.name.replace(/\s+/g, '-').toLowerCase()}.mobileconfig`
  res.setHeader('Content-Type', 'application/x-apple-aspen-config')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', buffer.length)
  return res.send(buffer)
}

// ─── GET /api/config/macos/:deviceId ─────────────────────

export async function downloadmacOSConfig(req: Request, res: Response) {
  const device = await prisma.device.findFirst({
    where: {
      id: req.params.deviceId,
      accountId: req.user!.accountId,
      type: 'macos',
    },
    include: { config: true },
  })

  if (!device) return sendError(res, 'macOS device not found', { status: 404 })

  const doh = await getDOHConfig(req.user!.accountId)
  const restrictions = {
    ...defaultmacOSRestrictions,
    ...((device.config?.restrictions ?? {}) as Partial<macOSRestrictions>),
  }

  const buffer = generatemacOSConfig(
    req.user!.accountId,
    device.id,
    restrictions,
    doh
  )

  const filename = `Noori-macos-${device.name.replace(/\s+/g, '-').toLowerCase()}.mobileconfig`
  res.setHeader('Content-Type', 'application/x-apple-aspen-config')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', buffer.length)
  return res.send(buffer)
}

// ─── POST /api/config/ios ─────────────────────────────────
// Create a new iOS config preset (restrictions only, no device attached)

export async function createiOSConfig(req: Request, res: Response) {
  const pro = await isPro(req.user!.accountId)
  if (!pro) {
    return sendError(res, 'iOS Config Generator requires a Pro subscription', {
      status: 402,
    })
  }

  const schema = z.object({
    deviceId: z.string().min(1),
    restrictions: z.record(z.unknown()).default({}),
  })

  const { deviceId, restrictions } = schema.parse(req.body)

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      accountId: req.user!.accountId,
      type: 'ios',
    },
  })

  if (!device) return sendError(res, 'iOS device not found', { status: 404 })

  const config = await prisma.deviceConfig.upsert({
    where: { deviceId },
    update: { restrictions, cfConfigHash: null },
    create: { deviceId, restrictions },
  })

  return sendSuccess(res, config, {
    message: 'iOS config saved. Download it from the device page.',
    status: 201,
  })
}

// ─── POST /api/config/macos ───────────────────────────────

export async function createmacOSConfig(req: Request, res: Response) {
  const schema = z.object({
    deviceId: z.string().min(1),
    restrictions: z.record(z.unknown()).default({}),
  })

  const { deviceId, restrictions } = schema.parse(req.body)

  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      accountId: req.user!.accountId,
      type: 'macos',
    },
  })

  if (!device) return sendError(res, 'macOS device not found', { status: 404 })

  const config = await prisma.deviceConfig.upsert({
    where: { deviceId },
    update: { restrictions, cfConfigHash: null },
    create: { deviceId, restrictions },
  })

  return sendSuccess(res, config, {
    message: 'macOS config saved. Download it from the device page.',
    status: 201,
  })
}

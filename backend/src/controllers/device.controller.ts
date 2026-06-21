import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { generateiOSConfig, generatemacOSConfig } from '../services/config.service.js'
import { getPlanLimits } from '../config/plans.js'
import {
  defaultiOSRestrictions,
  defaultmacOSRestrictions,
  iOSRestrictions,
  macOSRestrictions,
} from '../types/device.types.js'

// ─── GET /api/devices ─────────────────────────────────────

export async function getDevices(req: Request, res: Response) {
  const devices = await prisma.device.findMany({
    where: { accountId: req.user!.accountId },
    include: {
      config: {
        select: {
          id: true,
          updatedAt: true,
          cfConfigHash: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return sendSuccess(res, devices)
}

// ─── GET /api/devices/:id ─────────────────────────────────

export async function getDevice(req: Request, res: Response) {
  const id = req.params.id as string;

  const device = await prisma.device.findFirst({
    where: {
      id,
      accountId: req.user!.accountId,
    },
    include: { config: true },
  })

  if (!device) return sendError(res, 'Device not found', { status: 404 })

  return sendSuccess(res, device)
}

// ─── POST /api/devices ────────────────────────────────────

export async function createDevice(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1).max(60),
    type: z.enum(['ios', 'macos', 'android', 'windows', 'router']),
  })

  const { name, type } = schema.parse(req.body)

  // Plan gate — check device count limit
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })
  const limits = getPlanLimits(sub?.plan ?? 'free')

  if (limits.maxDevices !== null) {
    const currentCount = await prisma.device.count({
      where: { accountId: req.user!.accountId },
    })
    if (currentCount >= limits.maxDevices) {
      return sendError(
        res,
        `Your ${limits.name} plan supports up to ${limits.maxDevices} device${limits.maxDevices === 1 ? '' : 's'}. Upgrade to add more.`,
        { status: 402 }
      )
    }
  }

  // Set default restrictions based on device type
  const defaultRestrictions =
    type === 'ios'
      ? defaultiOSRestrictions
      : type === 'macos'
        ? defaultmacOSRestrictions
        : {}

  const device = await prisma.device.create({
    data: {
      accountId: req.user!.accountId,
      name,
      type,
      config: {
        create: {
          restrictions: defaultRestrictions,
        },
      },
    },
    include: { config: true },
  })

  return sendSuccess(res, device, {
    message: 'Device registered successfully',
    status: 201,
  })
}

// ─── PATCH /api/devices/:id ───────────────────────────────

export async function updateDevice(req: Request, res: Response) {
  const schema = z.object({
    name: z.string().min(1).max(60).optional(),
    isActive: z.boolean().optional(),
  })

  const body = schema.parse(req.body)
  const id = req.params.id as string;

  const device = await prisma.device.findFirst({
    where: {
      id,
      accountId: req.user!.accountId
    },
  })

  if (!device) return sendError(res, 'Device not found', { status: 404 })

  const updated = await prisma.device.update({
    where: {
      id,
    },
    data: body,
  })

  return sendSuccess(res, updated, { message: 'Device updated' })
}

// ─── DELETE /api/devices/:id ──────────────────────────────

export async function deleteDevice(req: Request, res: Response) {
  const id = req.params.id as string;

  const device = await prisma.device.findFirst({
    where: {
      id,
      accountId: req.user!.accountId
    },
  })

  if (!device) return sendError(res, 'Device not found', { status: 404 })

  await prisma.device.delete({
    where: {
      id
    }
  })

  return sendSuccess(res, null, { message: 'Device removed' })
}

// ─── POST /api/devices/:id/config ────────────────────────
// Save or update restrictions for a device

export async function saveDeviceConfig(req: Request, res: Response) {
  const schema = z.object({
    restrictions: z.record(z.unknown()),
  })

  const { restrictions } = schema.parse(req.body)
  const id = req.params.id as string;

  const device = await prisma.device.findFirst({
    where: {
      id,
      accountId: req.user!.accountId
    },
    select: { id: true, type: true },
  })

  if (!device) return sendError(res, 'Device not found', { status: 404 })

  const config = await prisma.deviceConfig.upsert({
    where: { deviceId: device.id },
    update: {
      restrictions: restrictions as Prisma.InputJsonValue,
      cfConfigHash: null, // invalidate 
    },
    create: {
      deviceId: device.id,
      restrictions: restrictions as Prisma.InputJsonValue,
    },
  })

  return sendSuccess(res, config, { message: 'Config saved' })
}

// ─── GET /api/devices/:id/download ───────────────────────
// Generate and stream the .mobileconfig file

export async function downloadDeviceConfig(req: Request, res: Response) {
  const id = req.params.id as string;

  const device = await prisma.device.findFirst({
    where: {
      id,
      accountId: req.user!.accountId
    },
    include: { config: true },
  })

  if (!device) return sendError(res, 'Device not found', { status: 404 })

  if (device.type !== 'ios' && device.type !== 'macos') {
    return sendError(
      res,
      'Config download is only available for iOS and macOS devices',
      { status: 400 }
    )
  }

  // Plan gate — both iOS and macOS config generators are paid-only now
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })
  const limits = getPlanLimits(sub?.plan ?? 'free')

  if (device.type === 'ios' && !limits.iosConfigGenerator) {
    return sendError(
      res,
      'iOS Config Generator requires a Pro or Family subscription',
      { status: 402 }
    )
  }
  if (device.type === 'macos' && !limits.macosConfigGenerator) {
    return sendError(
      res,
      'macOS Config Generator requires a Pro or Family subscription',
      { status: 402 }
    )
  }

  // Get DoH URL from account if CF is connected
  const account = await prisma.account.findUnique({
    where: { id: req.user!.accountId },
    select: { cfConnected: true, cfGatewayId: true, cfAccountId: true },
  })

  const doh =
    account?.cfConnected && account.cfGatewayId
      ? {
        serverURL: `https://${account.cfGatewayId}.cloudflare-gateway.com/dns-query`,
        serverName: `${account.cfGatewayId}.cloudflare-gateway.com`,
      }
      : undefined

  const restrictions = (device.config?.restrictions ?? {}) as Record<string, unknown>

  let configBuffer: Buffer

  if (device.type === 'ios') {
    const merged = { ...defaultiOSRestrictions, ...restrictions } as iOSRestrictions
    configBuffer = generateiOSConfig(
      req.user!.accountId,
      device.id,
      merged,
      doh
    )
  } else {
    const merged = { ...defaultmacOSRestrictions, ...restrictions } as macOSRestrictions
    configBuffer = generatemacOSConfig(
      req.user!.accountId,
      device.id,
      merged,
      doh
    )
  }

  const filename = `noori-${device.type}-${device.name.replace(/\s+/g, '-').toLowerCase()}.mobileconfig`

  res.setHeader('Content-Type', 'application/x-apple-aspen-config')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-Length', configBuffer.length)

  return res.send(configBuffer)
}
import { Request, Response } from 'express'
import { z } from 'zod'
import { sendSuccess, sendError } from '../utils/response.js'
import {
  runOnboardingSetup,
  applyPreset,
  getProtectionScore,
  PROTECTION_PRESETS,
} from '../services/onboarding.service.js'

// ─── GET /api/onboarding/presets ──────────────────────────
// Returns all available protection presets for the frontend to display

export async function getPresets(_req: Request, res: Response) {
  const presets = Object.entries(PROTECTION_PRESETS).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
    categoryCount: value.blockedCategories.length,
    safeSearch: value.safeSearchEnabled,
  }))

  return sendSuccess(res, presets)
}

// ─── POST /api/onboarding/setup ───────────────────────────
// One-shot: takes goal + protection level, sets everything up

export async function setupOnboarding(req: Request, res: Response) {
  const schema = z.object({
    goal: z.enum(['self', 'parental', 'both']),
    level: z.enum(['basic', 'balanced', 'maximum']),
  })

  const { goal, level } = schema.parse(req.body)

  const result = await runOnboardingSetup(req.user!.accountId, goal, level)

  return sendSuccess(res, result, {
    message: result.message,
    status: 201,
  })
}

// ─── POST /api/onboarding/preset ─────────────────────────
// Apply a preset to existing account (post-onboarding)

export async function applyProtectionPreset(req: Request, res: Response) {
  const schema = z.object({
    preset: z.enum(['basic', 'balanced', 'maximum']),
  })

  const { preset } = schema.parse(req.body)

  await applyPreset(req.user!.accountId, preset)

  return sendSuccess(res, null, {
    message: `${PROTECTION_PRESETS[preset].name} applied`,
  })
}

// ─── GET /api/onboarding/score ────────────────────────────

export async function getScore(req: Request, res: Response) {
  const result = await getProtectionScore(req.user!.accountId)
  return sendSuccess(res, result)
}

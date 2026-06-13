import { prisma } from '../config/database.js'
import { pushPolicyToCloudflare } from './cloudflare.service.js'

// ─── Category ID map (from PDR) ───────────────────────────

export const CF_CATEGORIES = {
  adult: 1,
  gambling: 7,
  malware: 117,
  phishing: 108,
  socialMedia: 122,
  videoStreaming: 135,
  gaming: 6,
  drugsAlcohol: 4,
  violence: 14,
  hateSpeech: 9,
  anonymizersVPNs: 100,
  cryptocurrency: 118,
  torrents: 133,
} as const

// ─── Protection presets ───────────────────────────────────

export const PROTECTION_PRESETS = {
  // Self-control: adult + bypass tools
  basic: {
    name: 'Basic Protection',
    blockedCategories: [
      CF_CATEGORIES.adult,
      CF_CATEGORIES.anonymizersVPNs,
      CF_CATEGORIES.malware,
      CF_CATEGORIES.phishing,
    ],
    safeSearchEnabled: true,
    description: 'Blocks adult content, VPNs, and security threats',
  },

  // Balanced: + social media + gambling
  balanced: {
    name: 'Balanced Protection',
    blockedCategories: [
      CF_CATEGORIES.adult,
      CF_CATEGORIES.anonymizersVPNs,
      CF_CATEGORIES.malware,
      CF_CATEGORIES.phishing,
      CF_CATEGORIES.gambling,
      CF_CATEGORIES.socialMedia,
    ],
    safeSearchEnabled: true,
    description: 'Blocks adult content, social media, gambling, VPNs, and threats',
  },

  // Maximum: everything
  maximum: {
    name: 'Maximum Protection',
    blockedCategories: [
      CF_CATEGORIES.adult,
      CF_CATEGORIES.anonymizersVPNs,
      CF_CATEGORIES.malware,
      CF_CATEGORIES.phishing,
      CF_CATEGORIES.gambling,
      CF_CATEGORIES.socialMedia,
      CF_CATEGORIES.videoStreaming,
      CF_CATEGORIES.violence,
      CF_CATEGORIES.hateSpeech,
      CF_CATEGORIES.drugsAlcohol,
      CF_CATEGORIES.torrents,
      CF_CATEGORIES.cryptocurrency,
    ],
    safeSearchEnabled: true,
    description: 'Maximum blocking — adult, social, streaming, violence, and more',
  },
} as const

export type ProtectionLevel = keyof typeof PROTECTION_PRESETS
export type OnboardingGoal = 'self' | 'parental' | 'both'

// ─── Run onboarding setup ─────────────────────────────────

export async function runOnboardingSetup(
  accountId: string,
  goal: OnboardingGoal,
  level: ProtectionLevel
): Promise<{ policyId: string; message: string }> {
  const preset = PROTECTION_PRESETS[level]

  // Delete any existing default policy first to avoid duplicates
  await prisma.contentPolicy.deleteMany({
    where: { accountId, name: { in: ['Default Policy', preset.name] } },
  })

  // Create the policy in DB
  const policy = await prisma.contentPolicy.create({
    data: {
      accountId,
      name: preset.name,
      blockedCategories: [...preset.blockedCategories],
      blockedDomains: [],
      allowedDomains: [],
      safeSearchEnabled: preset.safeSearchEnabled,
      isActive: true,
    },
  })

  // Push to Cloudflare if connected
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { cfConnected: true },
  })

  if (account?.cfConnected) {
    try {
      await pushPolicyToCloudflare(accountId, policy.id)
    } catch (err) {
      console.error('CF push failed during onboarding:', err)
      // Don't fail onboarding — policy is saved locally
    }
  }

  return {
    policyId: policy.id,
    message: `${preset.name} applied successfully`,
  }
}

// ─── Apply a single named preset ─────────────────────────

export async function applyPreset(
  accountId: string,
  presetName: ProtectionLevel
): Promise<void> {
  const preset = PROTECTION_PRESETS[presetName]

  // Find existing policy or create new
  let policy = await prisma.contentPolicy.findFirst({
    where: { accountId },
    orderBy: { createdAt: 'asc' },
  })

  if (policy) {
    policy = await prisma.contentPolicy.update({
      where: { id: policy.id },
      data: {
        name: preset.name,
        blockedCategories: [...preset.blockedCategories],
        safeSearchEnabled: preset.safeSearchEnabled,
      },
    })
  } else {
    policy = await prisma.contentPolicy.create({
      data: {
        accountId,
        name: preset.name,
        blockedCategories: [...preset.blockedCategories],
        safeSearchEnabled: preset.safeSearchEnabled,
        blockedDomains: [],
        allowedDomains: [],
      },
    })
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { cfConnected: true },
  })

  if (account?.cfConnected) {
    await pushPolicyToCloudflare(accountId, policy.id)
  }
}

// ─── Protection score ─────────────────────────────────────

export interface ProtectionScoreItem {
  id: string
  label: string
  completed: boolean
  action: string // frontend route or action to fix it
}

export async function getProtectionScore(accountId: string): Promise<{
  score: number
  items: ProtectionScoreItem[]
}> {
  const [account, policy, device] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: {
        cfConnected: true,
        lockPin: true,
        isLocked: true,
      },
    }),
    prisma.contentPolicy.findFirst({
      where: { accountId, isActive: true },
      select: {
        blockedCategories: true,
        safeSearchEnabled: true,
        cfPolicyId: true,
      },
    }),
    prisma.device.findFirst({
      where: { accountId, isActive: true },
      select: { id: true, type: true },
    }),
  ])

  const hasAdultBlocked = policy?.blockedCategories?.includes(CF_CATEGORIES.adult) ?? false
  const hasVPNBlocked = policy?.blockedCategories?.includes(CF_CATEGORIES.anonymizersVPNs) ?? false
  const hasCFSynced = !!policy?.cfPolicyId

  const items: ProtectionScoreItem[] = [
    {
      id: 'cf_connected',
      label: 'Cloudflare account connected',
      completed: !!account?.cfConnected,
      action: '/settings/cloudflare',
    },
    {
      id: 'policy_active',
      label: 'Content policy created',
      completed: !!policy,
      action: '/content-policy',
    },
    {
      id: 'adult_blocked',
      label: 'Adult content blocked',
      completed: hasAdultBlocked,
      action: '/content-policy',
    },
    {
      id: 'vpn_blocked',
      label: 'VPN & bypass tools blocked',
      completed: hasVPNBlocked,
      action: '/content-policy',
    },
    {
      id: 'safesearch',
      label: 'Safe Search enabled',
      completed: !!policy?.safeSearchEnabled,
      action: '/content-policy',
    },
    {
      id: 'cf_synced',
      label: 'Policy synced to Cloudflare',
      completed: hasCFSynced,
      action: '/settings/cloudflare',
    },
    {
      id: 'device_setup',
      label: 'Device configured',
      completed: !!device,
      action: '/device-setup',
    },
    {
      id: 'profile_locked',
      label: 'Profile lock PIN set',
      completed: !!account?.lockPin,
      action: '/settings',
    },
  ]

  const completedCount = items.filter(i => i.completed).length
  const score = Math.round((completedCount / items.length) * 100)

  return { score, items }
}

// ─── Plan Configuration ──────────────────────────────────
// Single source of truth for all plan limits, pricing, and
// feature gates. Both backend gating logic and frontend
// billing UI read from this — change a number here, it
// updates everywhere.

export type PlanId = 'free' | 'pro' | 'family'
export type BillingInterval = 'monthly' | 'yearly'

export interface PlanLimits {
  id: PlanId
  name: string
  tagline: string

  // Pricing (USD only — single global price, no separate INR pricing)
  priceMonthly: number
  priceYearly: number

  // Device & policy limits
  maxDevices: number | null // null = unlimited
  maxPolicies: number | null // null = unlimited
  restrictedToBasicPreset: boolean // free tier — locked to Basic preset only

  // Activity logs
  logRetentionDays: number
  logSyncIntervalMinutes: number

  // Device config generators
  iosConfigGenerator: boolean
  macosConfigGenerator: boolean

  // Features
  safeSearchEnforcement: boolean
  customDomains: boolean
  timeLock: boolean // lock profile for N hours
  scheduledAutoLock: boolean // e.g. auto-lock every night
  policyScheduling: boolean // time-based policy activation (e.g. block social media 9-5)
  bypassEmailAlerts: boolean
  csvExport: boolean
  prioritySupport: boolean
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Basic protection to get started',
    priceMonthly: 0,
    priceYearly: 0,
    maxDevices: 1,
    maxPolicies: 1,
    restrictedToBasicPreset: true,
    logRetentionDays: 3,
    logSyncIntervalMinutes: 30,
    iosConfigGenerator: false,
    macosConfigGenerator: false,
    safeSearchEnforcement: true,
    customDomains: true,
    timeLock: false,
    scheduledAutoLock: false,
    policyScheduling: false,
    bypassEmailAlerts: false,
    csvExport: true,
    prioritySupport: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Full protection for individuals',
    priceMonthly: 5,
    priceYearly: 48, // 20% off $5 × 12 = $60
    maxDevices: 10,
    maxPolicies: 3,
    restrictedToBasicPreset: false,
    logRetentionDays: 30,
    logSyncIntervalMinutes: 5,
    iosConfigGenerator: true,
    macosConfigGenerator: true,
    safeSearchEnforcement: true,
    customDomains: true,
    timeLock: true,
    scheduledAutoLock: false,
    policyScheduling: true,
    bypassEmailAlerts: false,
    csvExport: true,
    prioritySupport: true,
  },
  family: {
    id: 'family',
    name: 'Family',
    tagline: 'Complete control for the whole household',
    priceMonthly: 9.99,
    priceYearly: 96, // 20% off $9.99 × 12 ≈ $119.88
    maxDevices: 20,
    maxPolicies: null, // unlimited
    restrictedToBasicPreset: false,
    logRetentionDays: 90,
    logSyncIntervalMinutes: 5,
    iosConfigGenerator: true,
    macosConfigGenerator: true,
    safeSearchEnforcement: true,
    customDomains: true,
    timeLock: true,
    scheduledAutoLock: true,
    policyScheduling: true,
    bypassEmailAlerts: true,
    csvExport: true,
    prioritySupport: true,
  },
}

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLANS[plan]
}

/** Basic preset's fixed category set — what free tier is locked to */
export const BASIC_PRESET_CATEGORIES = [1, 100, 117, 108] // Adult, VPNs, Malware, Phishing


export function getPlanPrice(plan: PlanId, interval: BillingInterval): number {
  const limits = PLANS[plan]
  return interval === 'yearly' ? limits.priceYearly : limits.priceMonthly
}


export function getGatewayPriceId(
  gateway: 'stripe' | 'razorpay',
  plan: 'pro' | 'family', // free has no price ID — it's not purchasable
  interval: BillingInterval,
  env: Record<string, string | undefined>
): string | null {
  const key = `${gateway === 'stripe' ? 'STRIPE' : 'RAZORPAY'}_${plan.toUpperCase()}_${interval.toUpperCase()}_${
    gateway === 'stripe' ? 'PRICE_ID' : 'PLAN_ID'
  }`
  return env[key] ?? null
}
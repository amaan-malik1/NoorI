import crypto from 'crypto'
import { env } from '../config/env.js'
import { prisma } from '../config/database.js'
import { RazorpaySubStatus } from '../types/billing.types.js'

// Razorpay REST API base
const RP_BASE = 'https://api.razorpay.com/v1'

function getRPHeaders() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not set')
  }
  const creds = Buffer.from(
    `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`
  ).toString('base64')
  return {
    Authorization: `Basic ${creds}`,
    'Content-Type': 'application/json',
  }
}

async function rpFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${RP_BASE}${path}`, {
    ...options,
    headers: { ...getRPHeaders(), ...(options.headers ?? {}) },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const description = (err as { error?: { description?: string; code?: string } }).error?.description
    const code = (err as { error?: { code?: string } }).error?.code

    // Razorpay returns "Authentication failed" for bad/test key_id+secret pairs.
    // Surface this as a config error, not a payment error.
    if (res.status === 401 || description?.toLowerCase().includes('authentication failed')) {
      throw new Error(
        'Razorpay credentials are invalid. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.'
      )
    }

    throw new Error(description ?? code ?? 'Razorpay API error')
  }
  return res.json() as Promise<T>
}
// ─── Types ────────────────────────────────────────────────

interface RPCustomer {
  id: string
  name: string
  email: string
}

interface RPSubscription {
  id: string
  plan_id: string
  status: RazorpaySubStatus
  current_start: number
  current_end: number
  short_url: string
}

// ─── Get or create Razorpay customer ─────────────────────

async function getOrCreateRPCustomer(
  accountId: string,
  email: string,
  name: string
): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { accountId },
    select: { razorpayCustomerId: true },
  })

  if (sub?.razorpayCustomerId) return sub.razorpayCustomerId

  const customer = await rpFetch<RPCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  })

  await prisma.subscription.update({
    where: { accountId },
    data: { razorpayCustomerId: customer.id },
  })

  return customer.id
}

// ─── Create subscription + return hosted checkout URL ─────

export async function createRazorpayCheckout(
  accountId: string,
  email: string,
  name: string
): Promise<{ subscriptionId: string; checkoutUrl: string; keyId: string }> {
  if (!env.RAZORPAY_PRO_PLAN_ID) throw new Error('RAZORPAY_PRO_PLAN_ID not set')

  const customerId = await getOrCreateRPCustomer(accountId, email, name)

  const rpSub = await rpFetch<RPSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: env.RAZORPAY_PRO_PLAN_ID,
      customer_notify: 1,
      quantity: 1,
      total_count: 12, // 12 months
      notes: { accountId },
    }),
  })

  // Save pending subscription ID
  await prisma.subscription.update({
    where: { accountId },
    data: {
      gateway: 'razorpay',
      razorpaySubscriptionId: rpSub.id,
    },
  })

  return {
    subscriptionId: rpSub.id,
    checkoutUrl: rpSub.short_url,
    keyId: env.RAZORPAY_KEY_ID!,
  }
}

// ─── Verify payment signature (client-side confirmation) ──

export function verifyRazorpaySignature(
  subscriptionId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex')

  return expected === signature
}

// ─── Webhook handler ──────────────────────────────────────

export async function handleRazorpayWebhook(
  rawBody: string,
  signature: string
): Promise<void> {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new Error('RAZORPAY_WEBHOOK_SECRET not set')

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (expected !== signature) {
    throw new Error('Invalid Razorpay webhook signature')
  }

  const event = JSON.parse(rawBody) as {
    event: string
    payload: {
      subscription?: { entity: RPSubscription & { notes: { accountId?: string } } }
      payment?: { entity: { id: string; subscription_id?: string } }
    }
  }

  const subEntity = event.payload.subscription?.entity
  const accountId = subEntity?.notes?.accountId

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged': {
      if (!accountId || !subEntity) break

      await prisma.subscription.update({
        where: { accountId },
        data: {
          plan: 'pro',
          gateway: 'razorpay',
          razorpaySubscriptionId: subEntity.id,
          currentPeriodEnd: new Date(subEntity.current_end * 1000),
          cancelAtPeriodEnd: false,
        },
      })
      break
    }

    case 'subscription.cancelled':
    case 'subscription.expired': {
      if (!accountId) break

      await prisma.subscription.update({
        where: { accountId },
        data: {
          plan: 'free',
          razorpaySubscriptionId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      })
      break
    }

    case 'subscription.pending':
    case 'subscription.halted': {
      if (!accountId) break
      console.warn(`Razorpay subscription issue for account ${accountId}: ${event.event}`)
      // TODO: send payment issue email
      break
    }

    default:
      break
  }
}

// ─── Cancel Razorpay subscription ─────────────────────────

export async function cancelRazorpaySubscription(accountId: string): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { accountId },
    select: { razorpaySubscriptionId: true },
  })

  if (!sub?.razorpaySubscriptionId) return

  await rpFetch(`/subscriptions/${sub.razorpaySubscriptionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ cancel_at_cycle_end: 1 }), // cancel at end of period
  })

  await prisma.subscription.update({
    where: { accountId },
    data: { cancelAtPeriodEnd: true },
  })
}

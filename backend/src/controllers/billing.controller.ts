import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { env } from '../config/env.js'
import {
  createStripeCheckout,
  createStripePortalSession,
  handleStripeWebhook,
} from '../services/stripe.service.js'
import {
  createRazorpayCheckout,
  verifyRazorpaySignature,
  handleRazorpayWebhook,
  cancelRazorpaySubscription,
} from '../services/razorpay.service.js'

// ─── GET /api/billing ─────────────────────────────────────

export async function getBillingStatus(req: Request, res: Response) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: {
      plan: true,
      gateway: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  })

  return sendSuccess(res, {
    plan: sub?.plan ?? 'free',
    gateway: sub?.gateway ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    pricing: {
      usd: env.PRO_PRICE_USD,
      inr: env.PRO_PRICE_INR,
    },
    gatewaysAvailable: {
      stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID),
      razorpay: !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_PRO_PLAN_ID),
    },
  })
}

// ─── POST /api/billing/checkout ───────────────────────────
// Auto-detect gateway from currency, or user passes preferred gateway

export async function createCheckout(req: Request, res: Response) {
  const schema = z.object({
    gateway: z.enum(['stripe', 'razorpay']),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    name: z.string().optional(), // needed for Razorpay customer
  })

  const { gateway, successUrl, cancelUrl, name } = schema.parse(req.body)

  const defaultSuccess = `${env.FRONTEND_URL}/settings/billing?success=1`
  const defaultCancel = `${env.FRONTEND_URL}/settings/billing?cancelled=1`

  // Check not already pro
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })

  if (sub?.plan === 'pro') {
    return sendError(res, 'Already on Pro plan', { status: 409 })
  }

  if (gateway === 'stripe') {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRO_PRICE_ID) {
      return sendError(res, 'Card payments are not available yet. Please use UPI/Razorpay.', {
        status: 503,
      })
    }

    const url = await createStripeCheckout(
      req.user!.accountId,
      req.user!.email,
      successUrl ?? defaultSuccess,
      cancelUrl ?? defaultCancel
    )
    return sendSuccess(res, { checkoutUrl: url, gateway: 'stripe' })
  }

  // Razorpay
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_PRO_PLAN_ID) {
    return sendError(res, 'Payments are not configured yet.', { status: 503 })
  }


  // Razorpay
  const result = await createRazorpayCheckout(
    req.user!.accountId,
    req.user!.email,
    name ?? req.user!.email
  )

  return sendSuccess(res, {
    ...result,
    gateway: 'razorpay',
    // Frontend uses keyId + subscriptionId to open Razorpay checkout widget
  })
}

// ─── POST /api/billing/razorpay/verify ───────────────────
// Called by frontend after Razorpay payment success

export async function verifyRazorpayPayment(req: Request, res: Response) {
  const schema = z.object({
    razorpay_payment_id: z.string(),
    razorpay_subscription_id: z.string(),
    razorpay_signature: z.string(),
  })

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } =
    schema.parse(req.body)

  const valid = verifyRazorpaySignature(
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature
  )

  if (!valid) {
    return sendError(res, 'Invalid payment signature', { status: 400 })
  }

  // Optimistically upgrade — webhook will confirm
  await prisma.subscription.update({
    where: { accountId: req.user!.accountId },
    data: {
      plan: 'pro',
      gateway: 'razorpay',
      razorpaySubscriptionId: razorpay_subscription_id,
    },
  })

  return sendSuccess(res, null, { message: 'Payment verified. Pro plan activated!' })
}

// ─── POST /api/billing/portal ─────────────────────────────
// Stripe only — Razorpay managed via their dashboard

export async function getBillingPortal(req: Request, res: Response) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { gateway: true, plan: true },
  })

  if (sub?.plan !== 'pro') {
    return sendError(res, 'No active Pro subscription', { status: 400 })
  }

  if (sub.gateway === 'razorpay') {
    // For Razorpay, we handle cancellation directly via our API
    return sendSuccess(res, {
      gateway: 'razorpay',
      message: 'Use the cancel endpoint to manage your Razorpay subscription',
    })
  }

  const returnUrl = `${env.FRONTEND_URL}/settings/billing`
  const url = await createStripePortalSession(req.user!.accountId, returnUrl)

  return sendSuccess(res, { portalUrl: url, gateway: 'stripe' })
}

// ─── POST /api/billing/cancel ─────────────────────────────

export async function cancelSubscription(req: Request, res: Response) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true, gateway: true },
  })

  if (sub?.plan !== 'pro') {
    return sendError(res, 'No active Pro subscription to cancel', { status: 400 })
  }

  if (sub.gateway === 'razorpay') {
    await cancelRazorpaySubscription(req.user!.accountId)
    return sendSuccess(res, null, {
      message: 'Subscription will cancel at the end of the current billing period',
    })
  }

  // Stripe — redirect to portal for cancellation
  const returnUrl = `${env.FRONTEND_URL}/settings/billing`
  const url = await createStripePortalSession(req.user!.accountId, returnUrl)

  return sendSuccess(res, { portalUrl: url })
}

// ─── POST /api/billing/webhooks/stripe ───────────────────

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'] as string

  if (!signature) {
    return sendError(res, 'Missing stripe-signature header', { status: 400 })
  }

  try {
    // req.body is raw Buffer here (set in router)
    await handleStripeWebhook(req.body as Buffer, signature)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return sendError(res, 'Webhook processing failed', { status: 400 })
  }
}

// ─── POST /api/billing/webhooks/razorpay ─────────────────

export async function razorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string

  if (!signature) {
    return sendError(res, 'Missing x-razorpay-signature header', { status: 400 })
  }

  try {
    const rawBody = JSON.stringify(req.body)
    await handleRazorpayWebhook(rawBody, signature)
    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Razorpay webhook error:', err)
    return sendError(res, 'Webhook processing failed', { status: 400 })
  }
}

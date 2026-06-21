import { Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../config/database.js'
import { sendSuccess, sendError } from '../utils/response.js'
import { env } from '../config/env.js'
import { PLANS, getGatewayPriceId } from '../config/plans.js'
import type { PlanId, BillingInterval } from '../config/plans.js'
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
      billingInterval: true,
      gateway: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  })

  // Check which (plan, interval) combos actually have a configured price ID
  // for each gateway — frontend uses this to grey out unavailable options
  // rather than letting the user pick something that will 503 at checkout
  const envRecord = env as unknown as Record<string, string | undefined>
  const gatewaysAvailable = {
    stripe: !!env.STRIPE_SECRET_KEY,
    razorpay: !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  }

  const priceIdsConfigured = {
    stripe: {
      pro: {
        monthly: !!getGatewayPriceId('stripe', 'pro', 'monthly', envRecord),
        yearly: !!getGatewayPriceId('stripe', 'pro', 'yearly', envRecord),
      },
      family: {
        monthly: !!getGatewayPriceId('stripe', 'family', 'monthly', envRecord),
        yearly: !!getGatewayPriceId('stripe', 'family', 'yearly', envRecord),
      },
    },
    razorpay: {
      pro: {
        monthly: !!getGatewayPriceId('razorpay', 'pro', 'monthly', envRecord),
        yearly: !!getGatewayPriceId('razorpay', 'pro', 'yearly', envRecord),
      },
      family: {
        monthly: !!getGatewayPriceId('razorpay', 'family', 'monthly', envRecord),
        yearly: !!getGatewayPriceId('razorpay', 'family', 'yearly', envRecord),
      },
    },
  }

  return sendSuccess(res, {
    plan: sub?.plan ?? 'free',
    billingInterval: sub?.billingInterval ?? 'monthly',
    gateway: sub?.gateway ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    // Full plan catalog — single source of truth for the pricing page,
    // so the frontend never hardcodes a price or limit
    plans: PLANS,
    gatewaysAvailable,
    priceIdsConfigured,
  })
}

// ─── POST /api/billing/checkout ───────────────────────────

export async function createCheckout(req: Request, res: Response) {
  const schema = z.object({
    gateway: z.enum(['stripe', 'razorpay']),
    plan: z.enum(['pro', 'family']),
    interval: z.enum(['monthly', 'yearly']),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
    name: z.string().optional(), // needed for Razorpay customer
  })

  const { gateway, plan, interval, successUrl, cancelUrl, name } = schema.parse(req.body)

  const defaultSuccess = `${env.FRONTEND_URL}/dashboard/settings?tab=billing&success=1`
  const defaultCancel = `${env.FRONTEND_URL}/dashboard/settings?tab=billing&cancelled=1`

  // Block if already on this plan or higher — simple equality check;
  // upgrading pro→family or downgrading is a separate "change plan" flow,
  // not handled by this endpoint (intentional — keeps checkout simple for v1)
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true },
  })

  if (sub?.plan === plan) {
    return sendError(res, `You're already on the ${PLANS[plan].name} plan`, { status: 409 })
  }

  const envRecord = env as unknown as Record<string, string | undefined>

  if (gateway === 'stripe') {
    if (!env.STRIPE_SECRET_KEY) {
      return sendError(res, 'Card payments are not available yet. Please use UPI/Razorpay.', {
        status: 503,
      })
    }
    const priceId = getGatewayPriceId('stripe', plan, interval, envRecord)
    if (!priceId) {
      return sendError(res, `This plan isn't available via card payment yet.`, { status: 503 })
    }

    const url = await createStripeCheckout(
      req.user!.accountId,
      req.user!.email,
      plan,
      interval,
      successUrl ?? defaultSuccess,
      cancelUrl ?? defaultCancel
    )
    return sendSuccess(res, { checkoutUrl: url, gateway: 'stripe' })
  }

  // Razorpay
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return sendError(res, 'Payments are not configured yet.', { status: 503 })
  }
  const planId = getGatewayPriceId('razorpay', plan, interval, envRecord)
  if (!planId) {
    return sendError(res, `This plan isn't available via UPI/Razorpay yet.`, { status: 503 })
  }

  const result = await createRazorpayCheckout(
    req.user!.accountId,
    req.user!.email,
    name ?? req.user!.email,
    plan,
    interval
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
    plan: z.enum(['pro', 'family']),
    interval: z.enum(['monthly', 'yearly']),
  })

  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    plan,
    interval,
  } = schema.parse(req.body)

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
      plan,
      billingInterval: interval,
      gateway: 'razorpay',
      razorpaySubscriptionId: razorpay_subscription_id,
    },
  })

  return sendSuccess(res, null, {
    message: `Payment verified. ${PLANS[plan].name} plan activated!`,
  })
}

// ─── POST /api/billing/portal ─────────────────────────────
// Stripe only — Razorpay managed via their dashboard

export async function getBillingPortal(req: Request, res: Response) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { gateway: true, plan: true },
  })

  if (sub?.plan === 'free') {
    return sendError(res, 'No active paid subscription', { status: 400 })
  }

  if (sub?.gateway === 'razorpay') {
    // For Razorpay, we handle cancellation directly via our API
    return sendSuccess(res, {
      gateway: 'razorpay',
      message: 'Use the cancel endpoint to manage your Razorpay subscription',
    })
  }

  const returnUrl = `${env.FRONTEND_URL}/dashboard/settings?tab=billing`
  const url = await createStripePortalSession(req.user!.accountId, returnUrl)

  return sendSuccess(res, { portalUrl: url, gateway: 'stripe' })
}

// ─── POST /api/billing/cancel ─────────────────────────────

export async function cancelSubscription(req: Request, res: Response) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId: req.user!.accountId },
    select: { plan: true, gateway: true },
  })

  if (sub?.plan === 'free') {
    return sendError(res, 'No active paid subscription to cancel', { status: 400 })
  }

  if (sub?.gateway === 'razorpay') {
    await cancelRazorpaySubscription(req.user!.accountId)
    return sendSuccess(res, null, {
      message: 'Subscription will cancel at the end of the current billing period',
    })
  }

  // Stripe — redirect to portal for cancellation
  const returnUrl = `${env.FRONTEND_URL}/dashboard/settings?tab=billing`
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
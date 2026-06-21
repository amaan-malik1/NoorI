import Stripe from 'stripe'
import { env } from '../config/env.js'
import { prisma } from '../config/database.js'
import { getGatewayPriceId } from '../config/plans.js'
import type { PlanId, BillingInterval } from '../config/plans.js'

// Lazy init — only if key is set
let _stripe: Stripe | null = null

function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
    _stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

// ─── Create checkout session ──────────────────────────────

export async function createStripeCheckout(
  accountId: string,
  email: string,
  plan: 'pro' | 'family',
  interval: BillingInterval,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const stripe = getStripe()

  const priceId = getGatewayPriceId('stripe', plan, interval, env as unknown as Record<string, string | undefined>)
  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${plan} (${interval})`)
  }

  // Get or create Stripe customer
  let sub = await prisma.subscription.findUnique({
    where: { accountId },
    select: { stripeCustomerId: true },
  })

  let customerId = sub?.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({ email })
    customerId = customer.id

    await prisma.subscription.update({
      where: { accountId },
      data: { stripeCustomerId: customerId },
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { accountId, plan, interval },
    subscription_data: {
      metadata: { accountId, plan, interval },
    },
  })

  return session.url!
}

// ─── Customer portal (manage/cancel sub) ─────────────────

export async function createStripePortalSession(
  accountId: string,
  returnUrl: string
): Promise<string> {
  const stripe = getStripe()

  const sub = await prisma.subscription.findUnique({
    where: { accountId },
    select: { stripeCustomerId: true },
  })

  if (!sub?.stripeCustomerId) {
    throw new Error('No Stripe customer found')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  })

  return session.url
}

// ─── Webhook handler ──────────────────────────────────────

export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string
): Promise<void> {
  const stripe = getStripe()

  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not set')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch {
    throw new Error('Invalid Stripe webhook signature')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const accountId = session.metadata?.accountId
      const plan = (session.metadata?.plan as PlanId | undefined) ?? 'pro'
      const interval = (session.metadata?.interval as BillingInterval | undefined) ?? 'monthly'
      if (!accountId || !session.subscription) break

      const stripeSub = await stripe.subscriptions.retrieve(
        session.subscription as string
      )

      await prisma.subscription.update({
        where: { accountId },
        data: {
          plan,
          billingInterval: interval,
          gateway: 'stripe',
          stripeSubId: stripeSub.id,
          currentPeriodEnd: new Date(stripeSub.items.data[0].current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      })
      break
    }

    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription
      const accountId = stripeSub.metadata?.accountId
      const plan = (stripeSub.metadata?.plan as PlanId | undefined) ?? 'pro'
      if (!accountId) break

      const isActive = ['active', 'trialing'].includes(stripeSub.status)

      await prisma.subscription.update({
        where: { accountId },
        data: {
          plan: isActive ? plan : 'free',
          currentPeriodEnd: new Date(stripeSub.items.data[0].current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription
      const accountId = stripeSub.metadata?.accountId
      if (!accountId) break

      await prisma.subscription.update({
        where: { accountId },
        data: {
          plan: 'free',
          stripeSubId: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const sub = await prisma.subscription.findFirst({
        where: { stripeCustomerId: customerId },
        select: { accountId: true, account: { select: { user: { select: { email: true } } } } },
      })

      if (sub) {
        // TODO: send payment failed email
        console.warn(`Payment failed for account ${sub.accountId}`)
      }
      break
    }

    default:
      // Unhandled event — ignore
      break
  }
}
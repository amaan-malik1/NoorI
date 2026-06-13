import { Router } from 'express'
import express from 'express'
import {
  getBillingStatus,
  createCheckout,
  verifyRazorpayPayment,
  getBillingPortal,
  cancelSubscription,
  stripeWebhook,
  razorpayWebhook,
} from '../controllers/billing.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()

// ── Webhooks — raw body required, NO auth ─────────────────
// Must be registered BEFORE express.json() middleware in the router
router.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhook
)

router.post(
  '/webhooks/razorpay',
  express.json(),
  razorpayWebhook
)

// ── Authenticated routes ───────────────────────────────────
router.use(authenticate)

router.get('/', getBillingStatus)
router.post('/checkout', createCheckout)
router.post('/razorpay/verify', verifyRazorpayPayment)
router.post('/portal', getBillingPortal)
router.post('/cancel', cancelSubscription)

export default router

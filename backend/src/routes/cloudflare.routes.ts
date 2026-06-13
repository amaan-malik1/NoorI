import { Router } from 'express'
import {
  getCFStatus,
  verifyCFCredentials,
  connectCF,
  disconnectCF,
  getPolicies,
  createOrUpdatePolicy,
  deletePolicy,
} from '../controllers/cloudflare.controller.js'
import { authenticate, requireUnlocked } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.middleware.js'

const router = Router()

// All CF routes require auth
router.use(authenticate)

// Status — read only, no lock check needed
router.get('/status', getCFStatus)

// Wizard — rate limited to prevent API key abuse
const cfRateLimit = rateLimit({ windowSec: 60, max: 10, keyPrefix: 'cf-wizard' })

router.post('/verify', cfRateLimit, requireUnlocked, verifyCFCredentials)
router.post('/connect', cfRateLimit, requireUnlocked, connectCF)
router.delete('/disconnect', requireUnlocked, disconnectCF)

// Policies
router.get('/policies', getPolicies)
router.post('/policies', requireUnlocked, createOrUpdatePolicy)
router.delete('/policies/:id', requireUnlocked, deletePolicy)

export default router

import { Router } from 'express'
import {
  getCFStatus,
  verifyCFCredentials,
  connectCF,
  repairCFConnection,
  disconnectCF,
  getPolicies,
  createOrUpdatePolicy,
  deletePolicy,
} from '../controllers/cloudflare.controller.js'
import { authenticate, requireUnlocked } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/status', getCFStatus)

const cfRateLimit = rateLimit({ windowSec: 60, max: 10, keyPrefix: 'cf-wizard' })

router.post('/verify', cfRateLimit, requireUnlocked, verifyCFCredentials)
router.post('/connect', cfRateLimit, requireUnlocked, connectCF)
router.post('/repair', cfRateLimit, requireUnlocked, repairCFConnection)
router.delete('/disconnect', requireUnlocked, disconnectCF)

router.get('/policies', getPolicies)
router.post('/policies', requireUnlocked, createOrUpdatePolicy)
router.delete('/policies/:id', requireUnlocked, deletePolicy)

export default router
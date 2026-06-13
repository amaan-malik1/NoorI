import { Router } from 'express'
import {
  getPresets,
  setupOnboarding,
  applyProtectionPreset,
  getScore,
} from '../controllers/onboarding.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/presets', getPresets)
router.get('/score', getScore)
router.post('/setup', setupOnboarding)
router.post('/preset', applyProtectionPreset)

export default router

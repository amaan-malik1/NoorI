import { Router } from 'express'
import {
  downloadiOSConfig,
  downloadmacOSConfig,
  createiOSConfig,
  createmacOSConfig,
} from '../controllers/config.controller.js'
import { authenticate, requireUnlocked } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// Download (streams .mobileconfig file)
router.get('/ios/:deviceId', downloadiOSConfig)
router.get('/macos/:deviceId', downloadmacOSConfig)

// Create / update config settings
router.post('/ios', requireUnlocked, createiOSConfig)
router.post('/macos', requireUnlocked, createmacOSConfig)

export default router

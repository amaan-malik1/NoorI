import { Router } from 'express'
import {
  getActivityLogs,
  getActivityChart,
  getActivityStats,
  forceSync,
  exportActivityCSV,
} from '../controllers/activity.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { rateLimit } from '../middleware/rateLimit.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', getActivityLogs)
router.get('/chart', getActivityChart)
router.get('/stats', getActivityStats)
router.get('/export', exportActivityCSV)

// Force sync — rate limit to prevent abuse (5 per minute)
router.post(
  '/sync',
  rateLimit({ windowSec: 60, max: 5, keyPrefix: 'activity-sync' }),
  forceSync
)

export default router

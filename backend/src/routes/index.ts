import { Router } from 'express'
import authRoutes from './auth.routes.js'
import accountRoutes from './account.routes.js'
import cloudflareRoutes from './cloudflare.routes.js'
import deviceRoutes from './device.routes.js'
import configRoutes from './config.routes.js'
import activityRoutes from './activity.routes.js'
import billingRoutes from './billing.routes.js'
import onboardingRoutes from './onboarding.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/account', accountRoutes)
router.use('/cloudflare', cloudflareRoutes)
router.use('/devices', deviceRoutes)
router.use('/config', configRoutes)
router.use('/activity', activityRoutes)
router.use('/billing', billingRoutes)
router.use('/onboarding', onboardingRoutes)

export default router

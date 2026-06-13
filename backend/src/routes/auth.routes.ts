import { Router } from 'express'
import {
  register,
  verifyEmail,
  login,
  logout,
  refresh,
  me,
  forgotPassword,
  resetPassword,
  updateProfile,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { authRateLimit, passwordResetRateLimit } from '../middleware/rateLimit.middleware.js'

const router = Router()

// Public routes
router.post('/register', authRateLimit, register)
router.get('/verify-email', verifyEmail)
router.post('/login', authRateLimit, login)
router.post('/logout', logout)
router.post('/refresh', refresh)
router.post('/forgot-password', passwordResetRateLimit, forgotPassword)
router.post('/reset-password', resetPassword)

// Protected routes
router.get('/me', authenticate, me)
router.patch('/profile', authenticate, updateProfile)

export default router

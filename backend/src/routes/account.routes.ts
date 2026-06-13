import { Router } from 'express'
import {
  getAccount,
  getSetupProgress,
  setPin,
  lockProfile,
  unlockProfile,
  updateLockingPrefs,
} from '../controllers/account.controller.js'
import { authenticate, requireUnlocked } from '../middleware/auth.middleware.js'

const router = Router()

// All account routes require auth
router.use(authenticate)

router.get('/', getAccount)
router.get('/setup-progress', getSetupProgress)

// PIN — doesn't require unlocked (you need to be able to set PIN while locked)
router.post('/pin', setPin)

// Lock / unlock
router.post('/lock', lockProfile)
router.post('/unlock', unlockProfile)

// Prefs — require unlocked
router.patch('/locking-prefs', requireUnlocked, updateLockingPrefs)

export default router

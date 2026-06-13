import { Router } from 'express'
import {
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  saveDeviceConfig,
  downloadDeviceConfig,
} from '../controllers/device.controller.js'
import { authenticate, requireUnlocked } from '../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

router.get('/', getDevices)
router.get('/:id', getDevice)
router.post('/', requireUnlocked, createDevice)
router.patch('/:id', requireUnlocked, updateDevice)
router.delete('/:id', requireUnlocked, deleteDevice)

// Config
router.post('/:id/config', requireUnlocked, saveDeviceConfig)
router.get('/:id/download', downloadDeviceConfig) // streams file — no lock check needed

export default router

import { Router } from 'express'
import { notificationController } from '../controllers/notification.controller'

const router = Router()

router.post('/notifications/missed-punch', notificationController.sendMissedPunchNotice)
router.post('/notifications/expiry', notificationController.sendExpiryNotice)
router.post('/notifications/check-emails', notificationController.checkAndSendAutomatedEmails)

export default router

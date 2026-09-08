import { Router } from 'express'
import { attendanceController } from '../controllers/attendance.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/attendance', authMiddleware, attendanceController.getAttendance)
router.post('/attendance', authMiddleware, attendanceController.logAttendance)

export default router

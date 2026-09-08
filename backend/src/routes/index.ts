import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import memberRoutes from './member.routes'
import attendanceRoutes from './attendance.routes'
import expenseRoutes from './expense.routes'
import storeRoutes from './store.routes'
import branchRoutes from './branch.routes'
import uploadRoutes from './upload.routes'
import notificationRoutes from './notification.routes'

const router = Router()

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ALPHA FITNESS Backend', timestamp: new Date().toISOString() })
})

router.use('/auth', authRoutes)
router.use('/', userRoutes)
router.use('/', memberRoutes)
router.use('/', attendanceRoutes)
router.use('/', expenseRoutes)
router.use('/', storeRoutes)
router.use('/', branchRoutes)
router.use('/', uploadRoutes)
router.use('/', notificationRoutes)

export default router

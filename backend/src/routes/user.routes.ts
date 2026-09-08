import { Router } from 'express'
import { userController } from '../controllers/user.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/users', authMiddleware, userController.getAllUsers)
router.get('/users/:id', authMiddleware, userController.getUserById)

export default router

import { Router } from 'express'
import { authController } from '../controllers/auth.controller'
import { validateBody } from '../middleware/validation.middleware'

const router = Router()

router.post('/login', validateBody(['email', 'password']), authController.login)
router.post('/register', validateBody(['email', 'password']), authController.register)
router.post('/logout', authController.logout)
router.get('/me', authController.me)

export default router

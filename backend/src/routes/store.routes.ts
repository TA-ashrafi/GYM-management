import { Router } from 'express'
import { storeController } from '../controllers/store.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/products', authMiddleware, storeController.getProducts)
router.post('/products', authMiddleware, storeController.createProduct)

export default router

import { Router } from 'express'
import { expenseController } from '../controllers/expense.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/expenses', authMiddleware, expenseController.getExpenses)
router.post('/expenses', authMiddleware, expenseController.createExpense)

export default router

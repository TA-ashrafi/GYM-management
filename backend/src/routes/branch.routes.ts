import { Router } from 'express'
import { branchController } from '../controllers/branch.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/branches', authMiddleware, branchController.getBranches)
router.post('/branches', authMiddleware, branchController.createBranch)

export default router

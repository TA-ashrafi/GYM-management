import { Router } from 'express'
import { memberController } from '../controllers/member.controller'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

router.get('/members', authMiddleware, memberController.getAllMembers)
router.get('/members/:id', authMiddleware, memberController.getMemberById)
router.post('/members', authMiddleware, memberController.createMember)
router.put('/members/:id', authMiddleware, memberController.updateMember)
router.delete('/members/:id', authMiddleware, memberController.deleteMember)

export default router

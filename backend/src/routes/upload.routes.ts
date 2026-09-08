import { Router } from 'express'
import { uploadController } from '../controllers/upload.controller'

const router = Router()

router.post('/upload', uploadController.uploadImage)

export default router

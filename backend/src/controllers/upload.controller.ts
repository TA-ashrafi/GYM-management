import { Request, Response } from 'express'
import { cloudinaryService } from '../services/cloudinary.service'

export const uploadController = {
  async uploadImage(req: Request, res: Response) {
    try {
      const { image, folder } = req.body
      if (!image) {
        return res.status(400).json({ error: 'Missing image data (base64 string or URL required)' })
      }

      const url = await cloudinaryService.uploadImage(image, folder || 'alpha_fitness_members')
      res.json({ url, success: true })
    } catch (error: any) {
      console.error('Image upload failed:', error)
      res.status(500).json({ error: error.message || 'Image upload failed' })
    }
  },
}

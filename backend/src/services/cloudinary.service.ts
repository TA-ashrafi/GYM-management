import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export class CloudinaryService {
  async uploadImage(base64OrPath: string, folder = 'alpha_fitness_members'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64OrPath, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      })
      return result.secure_url
    } catch (error: any) {
      console.error('Cloudinary upload error:', error)
      throw new Error(`Cloudinary upload failed: ${error.message || error}`)
    }
  }
}

export const cloudinaryService = new CloudinaryService()

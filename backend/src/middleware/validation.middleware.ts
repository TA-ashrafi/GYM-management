import { Request, Response, NextFunction } from 'express'

export const validateBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return res.status(400).json({ error: 'Missing request body' })
    }

    const missingFields = requiredFields.filter((field) => !(field in req.body))
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      })
    }

    next()
  }
}

import { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/supabase'

export interface AuthenticatedRequest extends Request {
  user?: any
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing token header' })
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Malformed token' })
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized', details: err.message })
  }
}

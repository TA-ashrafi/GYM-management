import { Request, Response } from 'express'
import { supabase } from '../config/supabase'

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return res.status(400).json({ error: error.message })
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) return res.status(400).json({ error: error.message })
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async googleSignIn(req: Request, res: Response) {
    try {
      const redirectTo = (req.query.redirectTo as string) || 'http://localhost:5173/'
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })
      if (error) return res.status(400).json({ error: error.message })
      res.json(data)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) return res.status(400).json({ error: error.message })
      res.json({ message: 'Signed out successfully' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async me(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1]
      if (!token) return res.status(401).json({ error: 'Unauthorized' })

      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error) return res.status(401).json({ error: error.message })

      res.json({ user })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

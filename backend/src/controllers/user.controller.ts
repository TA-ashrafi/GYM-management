import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const userController = {
  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await supabaseService.getUsers()
      res.json(users)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const user = await supabaseService.getUserById(id)
      res.json(user)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

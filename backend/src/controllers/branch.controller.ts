import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const branchController = {
  async getBranches(req: Request, res: Response) {
    try {
      const branches = await supabaseService.getBranches()
      res.json(branches)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async createBranch(req: Request, res: Response) {
    try {
      const branch = await supabaseService.createBranch(req.body)
      res.status(201).json(branch)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

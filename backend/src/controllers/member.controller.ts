import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const memberController = {
  async getAllMembers(req: Request, res: Response) {
    try {
      const branchId = req.query.branch_id as string | undefined
      const members = await supabaseService.getMembers(branchId)
      res.json(members)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async getMemberById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const member = await supabaseService.getMemberById(id)
      res.json(member)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async createMember(req: Request, res: Response) {
    try {
      const member = await supabaseService.createMember(req.body)
      res.status(201).json(member)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async updateMember(req: Request, res: Response) {
    try {
      const { id } = req.params
      const member = await supabaseService.updateMember(id, req.body)
      res.json(member)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async deleteMember(req: Request, res: Response) {
    try {
      const { id } = req.params
      await supabaseService.deleteMember(id)
      res.json({ message: 'Member deleted successfully' })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

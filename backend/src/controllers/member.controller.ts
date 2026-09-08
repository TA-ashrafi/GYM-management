import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'
import { emailService } from '../services/email.service'

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
      const memberData = req.body
      const result = await supabaseService.createMember(memberData)

      // Asynchronously trigger welcome email if member has email
      const email = memberData.email || (Array.isArray(result) ? result[0]?.email : result?.email)
      const name = memberData.full_name || memberData.name || (Array.isArray(result) ? result[0]?.full_name : result?.name)
      const plan = memberData.membership_plan || memberData.plan || 'Standard'

      if (email && name) {
        emailService.sendWelcomeEmail(email, name, plan).catch((err) => {
          console.error('Error sending welcome email:', err)
        })
      }

      res.status(201).json(result)
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

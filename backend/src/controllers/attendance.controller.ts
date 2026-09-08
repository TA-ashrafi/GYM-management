import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const attendanceController = {
  async getAttendance(req: Request, res: Response) {
    try {
      const branchId = req.query.branch_id as string | undefined
      const logs = await supabaseService.getAttendance(branchId)
      res.json(logs)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async logAttendance(req: Request, res: Response) {
    try {
      const log = await supabaseService.logAttendance(req.body)
      res.status(201).json(log)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

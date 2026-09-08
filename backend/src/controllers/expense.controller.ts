import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const expenseController = {
  async getExpenses(req: Request, res: Response) {
    try {
      const branchId = req.query.branch_id as string | undefined
      const expenses = await supabaseService.getExpenses(branchId)
      res.json(expenses)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async createExpense(req: Request, res: Response) {
    try {
      const expense = await supabaseService.createExpense(req.body)
      res.status(201).json(expense)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

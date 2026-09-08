import { Request, Response } from 'express'
import { supabaseService } from '../services/supabase.service'

export const storeController = {
  async getProducts(req: Request, res: Response) {
    try {
      const branchId = req.query.branch_id as string | undefined
      const products = await supabaseService.getProducts(branchId)
      res.json(products)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },

  async createProduct(req: Request, res: Response) {
    try {
      const product = await supabaseService.createProduct(req.body)
      res.status(201).json(product)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  },
}

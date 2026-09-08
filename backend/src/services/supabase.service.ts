import { supabase } from '../config/supabase'

export class SupabaseService {
  // --- USERS & AUTH ---
  async getUsers() {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) {
      // Fallback to auth users if profiles table fails
      const { data: authData, error: authErr } = await supabase.from('users').select('*')
      if (authErr) throw error
      return authData
    }
    return data
  }

  async getUserById(id: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  // --- MEMBERS ---
  async getMembers(branchId?: string) {
    let query = supabase.from('members').select('*')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async getMemberById(id: string) {
    const { data, error } = await supabase.from('members').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  async createMember(memberData: any) {
    const { data, error } = await supabase.from('members').insert([memberData]).select()
    if (error) throw error
    return data
  }

  async updateMember(id: string, memberData: any) {
    const { data, error } = await supabase.from('members').update(memberData).eq('id', id).select()
    if (error) throw error
    return data
  }

  async deleteMember(id: string) {
    const { data, error } = await supabase.from('members').delete().eq('id', id)
    if (error) throw error
    return data
  }

  // --- ATTENDANCE ---
  async getAttendance(branchId?: string) {
    let query = supabase.from('attendance_logs').select('*')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async logAttendance(attendanceData: any) {
    const { data, error } = await supabase.from('attendance_logs').insert([attendanceData]).select()
    if (error) throw error
    return data
  }

  // --- EXPENSES ---
  async getExpenses(branchId?: string) {
    let query = supabase.from('expenses').select('*')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async createExpense(expenseData: any) {
    const { data, error } = await supabase.from('expenses').insert([expenseData]).select()
    if (error) throw error
    return data
  }

  // --- STORE PRODUCTS ---
  async getProducts(branchId?: string) {
    let query = supabase.from('products').select('*')
    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  }

  async createProduct(productData: any) {
    const { data, error } = await supabase.from('products').insert([productData]).select()
    if (error) throw error
    return data
  }

  // --- BRANCHES ---
  async getBranches() {
    const { data, error } = await supabase.from('branches').select('*')
    if (error) throw error
    return data
  }

  async createBranch(branchData: any) {
    const { data, error } = await supabase.from('branches').insert([branchData]).select()
    if (error) throw error
    return data
  }
}

export const supabaseService = new SupabaseService()

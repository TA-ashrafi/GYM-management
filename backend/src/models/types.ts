export interface User {
  id: string
  email: string
  role?: string
  created_at?: string
}

export interface Member {
  id: string
  branch_id?: string
  full_name: string
  email?: string
  phone?: string
  rfid_card_id?: string
  membership_plan?: string
  status?: string
  created_at?: string
}

export interface AttendanceRecord {
  id: string
  member_id: string
  branch_id?: string
  check_in: string
  check_out?: string
}

export interface Expense {
  id: string
  branch_id?: string
  title: string
  amount: number
  category?: string
  date: string
}

export interface StoreProduct {
  id: string
  branch_id?: string
  name: string
  price: number
  cost: number
  stock: number
}

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
}

import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function getAuthHeaders(customHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch (err) {
    console.warn('Failed to retrieve Supabase session token:', err)
  }

  return headers
}

export const apiClient = {
  async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    const requestHeaders = await getAuthHeaders(headers)
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: requestHeaders,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `GET ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async post<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    const requestHeaders = await getAuthHeaders(headers)
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `POST ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async put<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    const requestHeaders = await getAuthHeaders(headers)
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `PUT ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async delete<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    const requestHeaders = await getAuthHeaders(headers)
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: requestHeaders,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `DELETE ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },
}

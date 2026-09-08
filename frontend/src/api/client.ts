const API_BASE = import.meta.env.VITE_API_URL || '/api'

export const apiClient = {
  async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `GET ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async post<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `POST ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async put<T>(endpoint: string, data?: any, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `PUT ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },

  async delete<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `DELETE ${endpoint} failed with status ${response.status}`)
    }
    return response.json()
  },
}

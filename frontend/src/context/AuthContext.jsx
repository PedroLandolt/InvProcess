import { createContext, useContext, useState, useEffect } from 'react'
import { API_BASE } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('portline_user')
    const token = localStorage.getItem('portline_token')
    if (stored && token) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
  }, [])

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: false, error: data.detail || 'Invalid credentials' }
    }
    const data = await res.json()
    const userData = data.user
    setUser(userData)
    localStorage.setItem('portline_user', JSON.stringify(userData))
    localStorage.setItem('portline_token', data.token)
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('portline_user')
    localStorage.removeItem('portline_token')
  }

  const updateProfile = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      if (updates.name) {
        updated.initials = updates.name.split(' ').map(n => n[0]).join('').toUpperCase()
      }
      localStorage.setItem('portline_user', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, isManager: user?.role === 'manager' || user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

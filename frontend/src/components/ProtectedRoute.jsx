import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function GuestRoute({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
  return children
}

export function ManagerRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'manager' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

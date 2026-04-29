import { useAuth } from '../context/AuthContext'

export default function RoleGate({ role, children }) {
  const { user } = useAuth()
  if (role === 'manager' && user?.role !== 'manager' && user?.role !== 'admin') return null
  return children
}

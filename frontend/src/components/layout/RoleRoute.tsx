import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { User } from '../../types'

interface RoleRouteProps {
  roles: User['role'][]
  redirectTo?: string
}

export default function RoleRoute({ roles, redirectTo }: RoleRouteProps) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user || !roles.includes(user.role)) {
    return <Navigate to={redirectTo ?? '/'} replace />
  }

  return <Outlet />
}

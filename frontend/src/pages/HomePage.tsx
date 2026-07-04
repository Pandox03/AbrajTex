import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ComptablePage from './ComptablePage'
import DashboardPage from './DashboardPage'
import SecretairePage from './SecretairePage'

export default function HomePage() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user?.role === 'secretaire') return <SecretairePage />
  if (user?.role === 'comptable') return <ComptablePage />
  if (user?.role === 'admin') return <DashboardPage />

  return <Navigate to="/login" replace />
}

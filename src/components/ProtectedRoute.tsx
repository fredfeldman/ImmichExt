import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export const ProtectedRoute = () => {
  const token = useAuthStore((state) => state.token)
  const apiKey = useAuthStore((state) => state.apiKey)
  const isSessionLocked = useAuthStore((state) => state.isSessionLocked)

  if (!(token || apiKey)) {
    return <Navigate to="/login" replace />
  }

  if (isSessionLocked) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

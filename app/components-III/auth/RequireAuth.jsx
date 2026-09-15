import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'

export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  // The loading gate is non-negotiable: onAuthStateChanged restores the session
  // asynchronously. Without this, every page load for a signed-in user flashes
  // a redirect to /auth.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
      </div>
    )
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location }} />
  return <Outlet />
}
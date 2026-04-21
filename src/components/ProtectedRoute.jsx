import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Wait until auth context finishes loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-muted)] text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // If not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If admin route but user is not admin → redirect to normal dashboard
  if (requireAdmin && !user?.is_admin) {
    return <Navigate to="/roadmap-engine/courses" replace />
  }

  // Otherwise allow access
  return children
}

export default ProtectedRoute

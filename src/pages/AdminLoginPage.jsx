import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, LogIn, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { loginUser } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function AdminLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await loginUser(formData.username, formData.password)
      
      if (!data.user.is_admin) {
        setError('Access denied. Admin privileges required.')
        return
      }
      
      login(data.user, data.access_token)
      navigate('/admin-dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Login
        </Link>

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-warning)] to-[var(--color-danger)] flex items-center justify-center mb-4 glow-streak">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-foreground)]">
            Admin Access
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Sign in with administrator credentials
          </p>
        </div>

        {/* Login Form */}
        <div className="dashboard-card animate-fade-in-up border-[var(--color-warning)]/30" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <Shield className="w-4 h-4 text-[var(--color-warning)]" />
            <span className="text-xs text-[var(--color-warning)]">
              This area is restricted to administrators only
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Admin Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]/50 focus:border-[var(--color-warning)] transition-all"
                placeholder="Enter admin username"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)]/50 focus:border-[var(--color-warning)] transition-all"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20">
                <p className="text-sm text-[var(--color-danger)]">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-warning)] to-[var(--color-danger)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginPage

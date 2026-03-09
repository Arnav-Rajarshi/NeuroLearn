import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap, UserPlus, Eye, EyeOff, Mail, User } from 'lucide-react'
import { signupUser } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')

    try {
      const data = await signupUser(formData.username, formData.email, formData.password)
      login(data.user, data.access_token)
      navigate('/roadmap-engine/courses')
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center mb-4 glow-streak">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-[var(--color-foreground)]">
            Create Account
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Start your learning journey today
          </p>
        </div>

        {/* Signup Form */}
        <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  placeholder="Choose a username"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  placeholder="Enter your email"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  placeholder="Create a password"
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

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                placeholder="Confirm your password"
              />
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-[var(--color-muted)]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[var(--color-primary)] hover:text-[var(--color-accent)] font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignupPage

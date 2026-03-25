import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { GraduationCap, LogIn, Eye, EyeOff, Shield, Mail, RefreshCw, AlertCircle } from "lucide-react"
import { loginUser } from "../utils/api.js"
import { useAuth } from "../context/AuthContext.jsx"

// Retry configuration
const MAX_RETRIES = 2
const RETRY_DELAY = 1500

function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isNetworkError, setIsNetworkError] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/roadmap-engine/courses")
    }
  }, [authLoading, isAuthenticated, navigate])

  const attemptLogin = async (retries = 0) => {
    try {
      const data = await loginUser(email, password)
      
      // Store auth
      login(data.user, data.access_token)
      setIsNetworkError(false)

      // Redirect to courses
      navigate("/roadmap-engine/courses")
      return true
    } catch (err) {
      
      // Check if it's a network error
      const isNetwork = err.message?.includes('Failed to fetch') || 
                       err.message?.includes('NetworkError') ||
                       err.message?.includes('Network request failed')
      
      if (isNetwork && retries < MAX_RETRIES) {
        // Retry on network errors
        setRetryCount(retries + 1)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return attemptLogin(retries + 1)
      }
      
      setIsNetworkError(isNetwork)
      throw err
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setRetryCount(0)
    setIsNetworkError(false)

    try {
      await attemptLogin()
    } catch (err) {
      if (isNetworkError) {
        setError("Unable to connect to server. Please check your connection and try again.")
      } else {
        setError(err.message || "Login failed. Please check your credentials.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError("")
    handleSubmit({ preventDefault: () => {} })
  }

  // Show loading if checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-[var(--color-muted)] text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <h1 className="font-heading text-2xl font-bold text-[var(--color-foreground)]">
            Welcome Back
          </h1>

          <p className="text-sm text-[var(--color-muted)] mt-1">
            Sign in to continue your learning journey
          </p>
        </div>

        {/* Login Form */}
        <div className="dashboard-card">

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Email
              </label>

              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 pl-11 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  placeholder="Enter your email"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  placeholder="Enter password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-red-400 text-sm">{error}</p>
                    {isNetworkError && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={loading}
                        className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Try again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>

          </form>

          {/* Signup */}
          <div className="text-center mt-6 text-sm text-[var(--color-muted)]">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[var(--color-primary)] hover:text-[var(--color-accent)] font-medium transition-colors">
              Create one
            </Link>
          </div>
        </div>

        {/* Admin login */}
        <div className="mt-6 text-center">
          <Link
            to="/admin-login"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin Login
          </Link>
        </div>

      </div>
    </div>
  )
}

export default LoginPage

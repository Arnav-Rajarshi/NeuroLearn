import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { GraduationCap, LogIn, Eye, EyeOff, Shield } from "lucide-react"
import { loginUser } from "../utils/api.js"
import { useAuth } from "../context/AuthContext.jsx"

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    console.log("Lalalalalalaal100000000")
    setLoading(true)
    console.log("alalalalalal1")
    setError("")
    console.log("alalalalalal2")

    try {
      const data = await loginUser(username, password)
      console.log(data)
      console.log(data.user)
      console.log(data.access_token)

      // store auth
      login(data.user, data.access_token)

      // admin vs user redirect
      if (data.user && data.user.is_admin === true) {
        navigate("/admin-dashboard")
      } else {
        navigate("/roadmap-engine/courses")
      }

    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
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

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                Username
              </label>

              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
                placeholder="Enter username"
              />
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
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
                  placeholder="Enter password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
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
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white"
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
            <Link to="/signup" className="text-[var(--color-primary)]">
              Create one
            </Link>
          </div>
        </div>

        {/* Admin login */}
        <div className="mt-6 text-center">
          <Link
            to="/admin-login"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)]"
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

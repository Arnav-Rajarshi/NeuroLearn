import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Eye, EyeOff, Shield } from "lucide-react"
import { signupUser } from "../utils/api.js"
import { useAuth } from "../context/AuthContext.jsx"

function SignupPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isHovering, setIsHovering] = useState(false)

  const emailInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const confirmPasswordInputRef = useRef(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/roadmap-engine/courses")
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Validation
    if (!name.trim()) {
      setError("Please enter your name")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const data = await signupUser(name, email, password)
      login(data.user, data.access_token)
      navigate("/roadmap-engine/courses")
    } catch (err) {
      setError(err.message || "Sign up failed. Please try again.")
      // Shake animation
      const refs = [emailInputRef, nameInputRef, passwordInputRef, confirmPasswordInputRef]
      refs.forEach((ref) => {
        if (ref.current) {
          ref.current.style.animation = "shake 0.5s"
        }
      })
      setTimeout(() => {
        refs.forEach((ref) => {
          if (ref.current) ref.current.style.animation = ""
        })
      }, 500)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06080f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin" />
          <p className="text-[rgba(255,255,255,0.35)] text-sm">Checking authentication...</p>
        </div>
      </div>
    )
  }

  // Ambient particle positions
  const particles = [
    { top: "15%", left: "20%", delay: 0 },
    { top: "30%", left: "75%", delay: 0.5 },
    { top: "70%", left: "15%", delay: 1 },
    { top: "80%", left: "80%", delay: 1.5 },
    { top: "25%", left: "85%", delay: 2 },
    { top: "65%", left: "25%", delay: 2.5 },
  ]

  const ambientColors = [
    "rgba(99, 102, 241, 0.6)",
    "rgba(139, 92, 246, 0.4)",
    "rgba(168, 85, 247, 0.5)",
  ]

  return (
    <div className="relative min-h-screen bg-[#06080f] overflow-hidden">
      {/* Spline 3D Background */}
      <iframe
        src="https://my.spline.design/particlesflow-QKIL4y5UJNPTfDiDVGEy9wAP/"
        frameBorder="0"
        width="100%"
        height="100%"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
          opacity: 0.9,
        }}
      />

      {/* Radial Gradient Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(6,6,20,0.55) 0%, rgba(4,4,14,0.85) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Ambient Particle Elements */}
      {particles.map((particle, idx) => (
        <motion.div
          key={idx}
          style={{
            position: "fixed",
            width: "1px",
            height: "1px",
            borderRadius: "50%",
            backgroundColor: ambientColors[idx % ambientColors.length],
            top: particle.top,
            left: particle.left,
            zIndex: 2,
          }}
          animate={{
            y: [0, Math.sin(idx) * 40 - 20, 0],
            x: [0, Math.cos(idx) * 40 - 20, 0],
          }}
          transition={{
            duration: 4 + idx * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Main Container */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          padding: "24px",
          overflowY: "auto",
        }}
      >
        {/* Brand Mark */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            className="mx-auto mb-4"
            style={{
              stroke: "rgba(255,255,255,0.5)",
              strokeWidth: "1.5",
              fill: "none",
            }}
          >
            <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
          </svg>
          <h1
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: "15px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            NeuroLearn
          </h1>
        </motion.div>

        {/* Form Container */}
        <div
          style={{
            maxWidth: "420px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          {/* Name Field */}
          <motion.div
            style={{ marginBottom: "24px", position: "relative" }}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.02)",
                border: "1.5px solid rgba(99,102,241,0.5)",
                borderRadius: "14px",
                padding: "16px 20px",
                fontSize: "16px",
                color: "#e2e8f0",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                outline: "none",
                transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.9)"
                e.target.style.background = "rgba(99,102,241,0.04)"
                e.target.style.animation = "neon-breathe 2.5s ease-in-out infinite"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.5)"
                e.target.style.background = "rgba(255,255,255,0.02)"
                e.target.style.animation = "none"
              }}
            />
            <style>{`
              input::placeholder {
                color: rgba(255, 255, 255, 0.18);
                font-weight: 400;
              }
            `}</style>
          </motion.div>

          {/* Email Field */}
          <motion.div
            style={{ marginBottom: "24px", position: "relative" }}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={emailInputRef}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.02)",
                border: "1.5px solid rgba(99,102,241,0.5)",
                borderRadius: "14px",
                padding: "16px 20px",
                fontSize: "16px",
                color: "#e2e8f0",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                outline: "none",
                transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.9)"
                e.target.style.background = "rgba(99,102,241,0.04)"
                e.target.style.animation = "neon-breathe 2.5s ease-in-out infinite"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.5)"
                e.target.style.background = "rgba(255,255,255,0.02)"
                e.target.style.animation = "none"
              }}
            />
          </motion.div>

          {/* Password Field */}
          <motion.div
            style={{ marginBottom: "24px", position: "relative" }}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.55, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.02)",
                border: "1.5px solid rgba(99,102,241,0.5)",
                borderRadius: "14px",
                padding: "16px 20px",
                paddingRight: "50px",
                fontSize: "16px",
                color: "#e2e8f0",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                outline: "none",
                transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.9)"
                e.target.style.background = "rgba(99,102,241,0.04)"
                e.target.style.animation = "neon-breathe 2.5s ease-in-out infinite"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.5)"
                e.target.style.background = "rgba(255,255,255,0.02)"
                e.target.style.animation = "none"
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </motion.div>

          {/* Confirm Password Field */}
          <motion.div
            style={{ marginBottom: "24px", position: "relative" }}
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.65, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={confirmPasswordInputRef}
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="confirm password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.02)",
                border: "1.5px solid rgba(99,102,241,0.5)",
                borderRadius: "14px",
                padding: "16px 20px",
                paddingRight: "50px",
                fontSize: "16px",
                color: "#e2e8f0",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                outline: "none",
                transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.9)"
                e.target.style.background = "rgba(99,102,241,0.04)"
                e.target.style.animation = "neon-breathe 2.5s ease-in-out infinite"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(99,102,241,0.5)"
                e.target.style.background = "rgba(255,255,255,0.02)"
                e.target.style.animation = "none"
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: "12px",
                color: "rgba(239,100,100,0.8)",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              {error}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              height: "52px",
              borderRadius: "14px",
              background:
                "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
              border: "none",
              color: "white",
              fontSize: "15px",
              fontWeight: 600,
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              letterSpacing: "0.04em",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.3s ease",
              transform: isHovering && !loading ? "scale(1.02)" : "scale(1)",
              boxShadow: isHovering && !loading
                ? "0 0 30px rgba(99,102,241,0.6), 0 0 60px rgba(139,92,246,0.3), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 0 20px rgba(99,102,241,0.3)",
              opacity: loading ? 0.6 : 1,
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            {loading ? (
              <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "center" }}>
                <motion.div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "white",
                  }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            ) : (
              "Create Account"
            )}

            {/* Shimmer Effect */}
            {isHovering && !loading && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
                  pointerEvents: "none",
                }}
                animate={{ x: ["0%", "100%"] }}
                transition={{ duration: 0.5 }}
              />
            )}
          </motion.button>

          {/* Bottom Links */}
          <motion.div
            style={{
              marginTop: "32px",
              textAlign: "center",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.25)",
                marginBottom: "16px",
              }}
            >
              Already have an account?{" "}
              <a
                href="/login"
                style={{
                  color: "#818cf8",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Sign in
              </a>
            </p>
            <a
              href="/admin-login"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontSize: "11px",
                color: "rgba(255,255,255,0.15)",
                letterSpacing: "0.1em",
                textDecoration: "none",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.15)"}
            >
              <Shield size={12} />
              <span>Admin access</span>
            </a>
          </motion.div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
      `}</style>
    </div>
  )
}

export default SignupPage

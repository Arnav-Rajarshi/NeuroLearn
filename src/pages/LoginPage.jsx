import { useState, useEffect, useRef } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { loginUser } from "../utils/api.js"
import { useAuth } from "../context/AuthContext.jsx"

const MAX_RETRIES = 2
const RETRY_DELAY = 1500

const easeOutExpo = [0.22, 1, 0.36, 1]

const ambientParticles = [
  { top: '15%', left: '20%', color: 'rgba(99,102,241,0.6)', anim: 'float-particle-1', dur: '6s' },
  { top: '30%', left: '75%', color: 'rgba(139,92,246,0.4)', anim: 'float-particle-2', dur: '7s' },
  { top: '70%', left: '15%', color: 'rgba(168,85,247,0.5)', anim: 'float-particle-3', dur: '5s' },
  { top: '80%', left: '80%', color: 'rgba(99,102,241,0.6)', anim: 'float-particle-4', dur: '8s' },
  { top: '25%', left: '50%', color: 'rgba(139,92,246,0.4)', anim: 'float-particle-5', dur: '4.5s' },
  { top: '55%', left: '85%', color: 'rgba(168,85,247,0.5)', anim: 'float-particle-6', dur: '6.5s' },
  { top: '45%', left: '10%', color: 'rgba(99,102,241,0.5)', anim: 'float-particle-7', dur: '5.5s' },
  { top: '85%', left: '40%', color: 'rgba(139,92,246,0.6)', anim: 'float-particle-8', dur: '7.5s' },
]

function HexagonLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L21.66 7.5V16.5L12 22L2.34 16.5V7.5L12 2Z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  )
}

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/roadmap-engine/courses")
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (hasError) {
      const timer = setTimeout(() => setHasError(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [hasError])

  const attemptLogin = async (retries = 0) => {
    try {
      const data = await loginUser(email, password)
      login(data.user, data.access_token)
      setIsNetworkError(false)
      navigate("/roadmap-engine/courses")
      return true
    } catch (err) {
      const isNetwork = err.message?.includes('Failed to fetch') ||
                       err.message?.includes('NetworkError') ||
                       err.message?.includes('Network request failed')
      if (isNetwork && retries < MAX_RETRIES) {
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
    setHasError(false)

    try {
      await attemptLogin()
    } catch (err) {
      setHasError(true)
      if (isNetworkError) {
        setError("Unable to connect to server. Please check your connection and try again.")
      } else {
        setError(err.message || "Login failed. Please check your credentials.")
      }
    } finally {
      setLoading(false)
    }
  }

  const inputBaseStyle = {
    background: 'rgba(255,255,255,0.02)',
    border: '1.5px solid rgba(99,102,241,0.5)',
    borderRadius: '14px',
    padding: '16px 20px',
    fontSize: '16px',
    color: '#e2e8f0',
    fontFamily: "'Space Grotesk', system-ui",
    width: '100%',
    outline: 'none',
    transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
  }

  const inputFocusStyle = {
    border: '1.5px solid rgba(99,102,241,0.9)',
    background: 'rgba(99,102,241,0.04)',
    animation: 'neon-breathe 2.5s ease-in-out infinite',
  }

  const inputErrorStyle = {
    border: '1.5px solid rgba(239,68,68,0.8)',
    animation: 'neon-breathe-red 2.5s ease-in-out infinite',
  }

  const getInputStyle = (isFocused) => {
    if (hasError) return { ...inputBaseStyle, ...inputErrorStyle }
    if (isFocused) return { ...inputBaseStyle, ...inputFocusStyle }
    return inputBaseStyle
  }

  if (authLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '32px', height: '32px', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', fontFamily: "'Space Grotesk', system-ui" }}>Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06080f' }}>
      {/* Spline 3D Background */}
      <iframe
        src='https://my.spline.design/particlesflow-QKIL4y5UJNPTfDiDVGEy9wAP/'
        frameBorder='0'
        width='100%'
        height='100%'
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.9 }}
        title="Background animation"
      />

      {/* Radial Gradient Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(6,6,20,0.55) 0%, rgba(4,4,14,0.85) 100%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Ambient Floating Particles */}
      {ambientParticles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}`,
            zIndex: 2,
            animation: `${p.anim} ${p.dur} ease-in-out infinite`,
          }}
        />
      ))}

      {/* Form Container */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            maxWidth: '420px',
            width: '100%',
            padding: '0 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Brand Mark */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '48px',
            }}
          >
            <HexagonLogo />
            <span style={{
              fontFamily: "'Space Grotesk', system-ui",
              fontWeight: 600,
              fontSize: '15px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              NeuroLearn
            </span>
          </motion.div>

          {/* Email Input */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={hasError
              ? { opacity: 1, y: 0, filter: 'blur(0px)', x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0, filter: 'blur(0px)' }
            }
            transition={hasError
              ? { x: { duration: 0.5 } }
              : { delay: 0.5, duration: 0.8, ease: easeOutExpo }
            }
            style={{ width: '100%', marginBottom: '24px' }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="your email"
              style={{
                ...getInputStyle(emailFocused),
                '::placeholder': { color: 'rgba(255,255,255,0.18)' },
              }}
              className="neural-ink-input"
            />
          </motion.div>

          {/* Password Input */}
          <motion.div
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={hasError
              ? { opacity: 1, y: 0, filter: 'blur(0px)', x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { opacity: 1, y: 0, filter: 'blur(0px)' }
            }
            transition={hasError
              ? { x: { duration: 0.5 } }
              : { delay: 0.7, duration: 0.8, ease: easeOutExpo }
            }
            style={{ width: '100%', position: 'relative', marginBottom: '32px' }}
          >
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="password"
              style={{
                ...getInputStyle(passwordFocused),
                paddingRight: '52px',
              }}
              className="neural-ink-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            style={{ width: '100%' }}
          >
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)',
                border: 'none',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: "'Space Grotesk', system-ui",
                letterSpacing: '0.04em',
                cursor: loading ? 'wait' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transform: btnHover ? 'scale(1.02)' : 'scale(1)',
                boxShadow: btnHover
                  ? '0 0 30px rgba(99,102,241,0.6), 0 0 60px rgba(139,92,246,0.3), 0 8px 32px rgba(0,0,0,0.4)'
                  : '0 4px 16px rgba(0,0,0,0.3)',
                transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s cubic-bezier(0.22,1,0.36,1)',
                opacity: loading ? 0.85 : 1,
              }}
            >
              {/* Shimmer sweep */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
                transform: btnHover ? 'translateX(100%)' : 'translateX(-100%)',
                transition: 'transform 0.5s ease',
              }} />

              {/* Button content */}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ animation: 'loading-dot 1.4s infinite ease-in-out', animationDelay: '0s', fontSize: '24px', lineHeight: '16px' }}>·</span>
                    <span style={{ animation: 'loading-dot 1.4s infinite ease-in-out', animationDelay: '0.2s', fontSize: '24px', lineHeight: '16px' }}>·</span>
                    <span style={{ animation: 'loading-dot 1.4s infinite ease-in-out', animationDelay: '0.4s', fontSize: '24px', lineHeight: '16px' }}>·</span>
                  </span>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: '12px',
                  color: 'rgba(239,100,100,0.8)',
                  textAlign: 'center',
                  marginTop: '12px',
                  fontFamily: "'Space Grotesk', system-ui",
                }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Bottom Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            style={{ marginTop: '32px', textAlign: 'center' }}
          >
            <p style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.25)',
              fontFamily: "'Space Grotesk', system-ui",
            }}>
              Don't have an account?{' '}
              <Link
                to="/signup"
                style={{
                  color: '#818cf8',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Sign up
              </Link>
            </p>

            <Link
              to="/admin-login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '16px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.15)',
                letterSpacing: '0.1em',
                textDecoration: 'none',
                fontFamily: "'Space Grotesk', system-ui",
              }}
            >
              <ShieldIcon />
              Admin access
            </Link>
          </motion.div>
        </form>
      </div>

      {/* Inline placeholder style override */}
      <style>{`
        .neural-ink-input::placeholder {
          color: rgba(255,255,255,0.18) !important;
          font-weight: 400;
        }
        .neural-ink-input:focus {
          box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 0 20px rgba(99,102,241,0.4), 0 0 40px rgba(99,102,241,0.2), 0 0 80px rgba(99,102,241,0.08), inset 0 0 20px rgba(99,102,241,0.05);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default LoginPage
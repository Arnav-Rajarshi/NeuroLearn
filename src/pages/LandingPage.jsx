import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform,
} from "framer-motion"

// ── Design tokens ────────────────────────────────────────────────────────────
const BG = "#06080f"

const TEXT_PALETTE = [
  [99,  102, 241],
  [139,  92, 246],
  [168,  85, 247],
  [129, 140, 248],
  [167, 139, 250],
]

// Four nebula clusters [normalised cx/cy, influence radius, rgb]
const NEBULA_ZONES = [
  { cx: 0.18, cy: 0.28, r: 0.30, col: [99,  102, 241] }, // indigo — upper left
  { cx: 0.82, cy: 0.22, r: 0.26, col: [139,  92, 246] }, // violet — upper right
  { cx: 0.50, cy: 0.80, r: 0.28, col: [168,  85, 247] }, // purple — lower centre
  { cx: 0.08, cy: 0.68, r: 0.22, col: [110,  80, 235] }, // deep indigo — left
]

const BG_COUNT   = 620
const T_IMPLODE  = 380
const T_EXPLODE  = 700
const T_FADE     = 1000
const T_NAVIGATE = 1380

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const canvasRef   = useRef(null)
  const textRef     = useRef([])
  const bgRef       = useRef([])
  const mouseRef    = useRef({ x: -9999, y: -9999 })
  const tiltRef     = useRef({ x: 0, y: 0 })   // normalised −1..1 for parallax
  const phaseRef    = useRef("idle")
  const rafRef      = useRef(null)
  const clockRef    = useRef(0)

  const [phase,         setPhase        ] = useState("idle")
  const [showFlash,     setShowFlash     ] = useState(false)
  const [showShockwave, setShowShockwave ] = useState(false)
  const [showFade,      setShowFade      ] = useState(false)
  const [btnVisible,    setBtnVisible    ] = useState(false)
  const [btnHover,      setBtnHover      ] = useState(false)

  const navigate = useNavigate()

  // ── Framer Motion values for CSS 3-D tilt ────────────────────────────────
  const mouseXMV  = useMotionValue(0)
  const mouseYMV  = useMotionValue(0)
  const rotateY   = useSpring(useTransform(mouseXMV, [-1, 1], [-11, 11]), { stiffness: 32, damping: 14 })
  const rotateX   = useSpring(useTransform(mouseYMV, [-1, 1], [7, -7]),   { stiffness: 32, damping: 14 })

  const changePhase = useCallback((p) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  // ── Canvas engine ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext("2d")

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const W  = canvas.width
    const H  = canvas.height
    const CX = W / 2
    const CY = H / 2

    // ── Build galaxy background ────────────────────────────────────────────
    const buildBg = () => {
      const ps = []

      for (let i = 0; i < BG_COUNT; i++) {
        const x  = Math.random() * W
        const y  = Math.random() * H
        const nx = x / W
        const ny = y / H
        // z: depth layer — 1 = close/bright/large … 4 = far/dim/small
        const z  = 1 + Math.random() * 3

        let col      = [190, 205, 255]
        let isNebula = false

        for (const zone of NEBULA_ZONES) {
          const d = Math.sqrt((nx - zone.cx) ** 2 + (ny - zone.cy) ** 2)
          if (d < zone.r) {
            const prox = 1 - d / zone.r
            if (Math.random() < prox * 0.75) {
              col      = zone.col
              isNebula = true
              break
            }
          }
        }

        ps.push({
          x, y,
          z,
          // base size and opacity — scaled by z at render time
          baseSize:    isNebula ? 0.7 + Math.random() * 1.6 : 0.3 + Math.random() * 1.0,
          baseOpacity: isNebula ? 0.65 + Math.random() * 0.30 : 0.38 + Math.random() * 0.32,
          vx:          (Math.random() - 0.5) * 0.14,
          vy:          (Math.random() - 0.5) * 0.10,
          col,
          twinkle:     Math.random() * Math.PI * 2,
          off:         Math.random() * Math.PI * 2,
          isNebula,
        })
      }

      bgRef.current = ps
    }

    // ── Build text particles ───────────────────────────────────────────────
    const buildText = () => {
      const off    = document.createElement("canvas")
      off.width    = W
      off.height   = H
      const offCtx = off.getContext("2d")

      const fontSize = Math.min(W * 0.115, 110)
      offCtx.filter      = "blur(1.5px)"
      offCtx.fillStyle   = "#fff"
      offCtx.font        = `700 ${fontSize}px 'Space Grotesk', system-ui`
      offCtx.textAlign   = "center"
      offCtx.textBaseline = "middle"
      offCtx.fillText("NEUROLEARN", CX, CY)
      offCtx.filter = "none"

      const { data } = offCtx.getImageData(0, 0, W, H)
      const step = Math.max(3, Math.round(W / 400))
      const ps   = []

      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          if (data[(y * W + x) * 4 + 3] > 65) {
            const depth = 0.4 + Math.random() * 1.2
            const col   = TEXT_PALETTE[Math.floor(Math.random() * TEXT_PALETTE.length)]
            const jx    = (Math.random() - 0.5) * 1.6
            const jy    = (Math.random() - 0.5) * 1.6
            ps.push({
              x: x + jx,  y: y + jy,
              baseX: x + jx, baseY: y + jy,
              vx: 0, vy: 0,
              size:    (0.3 + Math.random() * 0.42) * depth,
              depth,
              col,
              opacity: Math.min(0.55 + depth * 0.25, 1),
              off:     Math.random() * Math.PI * 2,
              life:    1,
            })
          }
        }
      }

      textRef.current = ps
    }

    Promise.race([
      document.fonts.ready,
      new Promise(r => setTimeout(r, 600)),
    ]).then(() => {
      buildBg()
      buildText()
      setBtnVisible(true)
    })

    // Mouse handler — feeds both canvas ref and Framer Motion values
    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
      const nx = (e.clientX / window.innerWidth)  * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      mouseXMV.set(nx)
      mouseYMV.set(ny)
      tiltRef.current = { x: nx, y: ny }
    }
    window.addEventListener("mousemove", onMouseMove)

    // ── Render loop ───────────────────────────────────────────────────────
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      clockRef.current += 0.015

      const t  = clockRef.current
      const ph = phaseRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const tx = tiltRef.current.x  // −1..1 for parallax
      const ty = tiltRef.current.y

      // Full clear — no trails
      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)

      // ── Galaxy background with 3-D parallax ─────────────────────────────
      const bgs = bgRef.current
      for (let i = 0; i < bgs.length; i++) {
        const p = bgs[i]

        // Slow drift
        p.x += p.vx
        p.y += p.vy

        // Wrap
        if (p.x < -4) p.x = W + 4
        if (p.x > W + 4) p.x = -4
        if (p.y < -4) p.y = H + 4
        if (p.y > H + 4) p.y = -4

        // Cursor repulsion — weaker for bg
        const dx = mx - p.x
        const dy = my - p.y
        const d2 = dx * dx + dy * dy
        const R  = 180
        if (d2 < R * R && d2 > 0.01) {
          const d     = Math.sqrt(d2)
          const force = ((R - d) / R) * 0.5 * (1 / p.z)
          p.vx -= (dx / d) * force * 0.05
          p.vy -= (dy / d) * force * 0.05
        }
        p.vx *= 0.985
        p.vy *= 0.985

        // ── 3-D parallax offset: close (z≈1) moves most, far (z≈4) barely ─
        const parX = tx * (60 / p.z)
        const parY = ty * (42 / p.z)
        const sx   = p.x + parX    // screen position
        const sy   = p.y + parY

        // Twinkling
        const twinkle = 0.78 + 0.22 * Math.sin(t * (0.65 + (p.z % 1) * 0.4) + p.twinkle)

        // Depth-scaled size & opacity — close = larger & brighter
        const depthScale   = 1.8 / p.z
        const renderSize   = Math.max(p.baseSize * depthScale, 0.25)
        const renderAlpha  = Math.min(p.baseOpacity * (1.4 / p.z) * twinkle, 0.98)
        const [r, g, b]    = p.col

        // Core
        ctx.beginPath()
        ctx.arc(sx, sy, renderSize, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${renderAlpha})`
        ctx.fill()

        // Bright core gleam for close/nebula particles
        if (p.isNebula && p.z < 2) {
          ctx.beginPath()
          ctx.arc(sx, sy, renderSize * 0.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${renderAlpha * 0.35})`
          ctx.fill()
        }

        // Bloom halo
        if (p.isNebula) {
          ctx.beginPath()
          ctx.arc(sx, sy, renderSize * 5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${renderAlpha * 0.08})`
          ctx.fill()
        } else if (p.z < 1.8) {
          // Nearby stars also get a soft star-cross gleam (simple glow)
          ctx.beginPath()
          ctx.arc(sx, sy, renderSize * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${renderAlpha * 0.1})`
          ctx.fill()
        }
      }

      // ── Text particles ────────────────────────────────────────────────────
      const ps = textRef.current
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]

        if (ph === "idle") {
          const wX = Math.sin(t * 0.85 + p.off) * 0.5  * p.depth
          const wY = Math.cos(t * 0.65 + p.off) * 0.38 * p.depth
          const tX = p.baseX + wX
          const tY = p.baseY + wY

          const dx = mx - p.x
          const dy = my - p.y
          const d2 = dx * dx + dy * dy
          const R  = 115
          if (d2 < R * R && d2 > 0.01) {
            const d     = Math.sqrt(d2)
            const force = ((R - d) / R) * 2.9
            p.vx -= (dx / d) * force
            p.vy -= (dy / d) * force
          }
          p.vx += (tX - p.x) * 0.09
          p.vy += (tY - p.y) * 0.09
          p.vx *= 0.72
          p.vy *= 0.72
          p.x  += p.vx
          p.y  += p.vy

        } else if (ph === "charge") {
          const amp = 2.6 * p.depth
          p.x = p.baseX + (Math.random() - 0.5) * amp
          p.y = p.baseY + (Math.random() - 0.5) * amp

        } else if (ph === "implode") {
          p.vx += (CX - p.x) * 0.08 * p.depth
          p.vy += (CY - p.y) * 0.08 * p.depth
          p.x  += p.vx
          p.y  += p.vy

        } else if (ph === "explode" || ph === "transition") {
          p.x   += p.vx
          p.y   += p.vy
          p.vx  *= 0.92
          p.vy  *= 0.92
          p.life = Math.max(0, p.life - 0.02)
        }

        if (p.life <= 0) continue

        const glowBoost = ph === "charge" ? 1.6 : ph === "implode" ? 2.2 : 1
        const alpha     = Math.min(p.opacity * p.life * glowBoost, 1)
        const [r, g, b] = p.col

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fill()

        if (p.depth > 1.0 && ph !== "transition") {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${p.life * 0.055 * glowBoost})`
          ctx.fill()
        }
      }
    }

    loop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("mousemove", onMouseMove)
    }
  }, [mouseXMV, mouseYMV])

  // ── Sign In handler ───────────────────────────────────────────────────────
  const handleSignIn = useCallback(() => {
    if (phaseRef.current !== "idle") return

    setBtnVisible(false)
    changePhase("charge")

    setTimeout(() => {
      textRef.current.forEach(p => { p.vx = 0; p.vy = 0 })
      changePhase("implode")
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 230)
    }, T_IMPLODE)

    setTimeout(() => {
      const cx = window.innerWidth  / 2
      const cy = window.innerHeight / 2
      textRef.current.forEach(p => {
        const dx  = p.x - cx
        const dy  = p.y - cy
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const spd = 10 + Math.random() * 14
        p.vx   = (dx / len) * spd * p.depth
        p.vy   = (dy / len) * spd * p.depth
        p.life = 1
      })
      changePhase("explode")
      setShowShockwave(true)
      setTimeout(() => setShowShockwave(false), 900)
    }, T_EXPLODE)

    setTimeout(() => {
      changePhase("transition")
      setShowFade(true)
    }, T_FADE)

    setTimeout(() => navigate("/login"), T_NAVIGATE)
  }, [navigate, changePhase])

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: BG }}
    >
      {/* ── Perspective wrapper — enables CSS 3-D ─────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, perspective: "900px", perspectiveOrigin: "50% 50%" }}>
        {/* ── 3-D tilting canvas (also zooms on explosion) ────────────────── */}
        <motion.div
          style={{
            position:       "absolute",
            inset:          0,
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          animate={{
            scale: (phase === "explode" || phase === "transition") ? 1.18 : 1,
          }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <canvas
            ref={canvasRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        </motion.div>
      </div>

      {/* ── CSS nebula mood overlays ────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(ellipse 40% 32% at 18% 28%, rgba(99,102,241,0.09) 0%, transparent 100%),
            radial-gradient(ellipse 34% 28% at 82% 22%, rgba(139,92,246,0.08) 0%, transparent 100%),
            radial-gradient(ellipse 36% 30% at 50% 80%, rgba(168,85,247,0.09) 0%, transparent 100%),
            radial-gradient(ellipse 22% 22% at  8% 68%, rgba(110,80,235,0.07) 0%, transparent 100%)
          `,
          pointerEvents: "none",
        }}
      />

      {/* ── Central glow — intensifies on charge / implode ─────────────────── */}
      <motion.div
        animate={{
          opacity: phase === "charge" ? 0.85 : phase === "implode" ? 1 : 0.5,
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse 52% 44% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Edge vignette ──────────────────────────────────────────────────── */}
      <div
        style={{
          position:   "absolute",
          inset:      0,
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(6,8,15,0.96) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* ── Tagline ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "idle" && btnVisible && (
          <motion.p
            key="tagline"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ delay: 0.5, duration: 1.1, ease: "easeOut" }}
            style={{
              position:      "absolute",
              top:           "calc(50% + 75px)",
              left:          0,
              right:         0,
              textAlign:     "center",
              fontFamily:    "'Space Grotesk', system-ui",
              fontSize:      "11.5px",
              fontWeight:    500,
              color:         "rgba(255,255,255,0.28)",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              pointerEvents: "none",
              zIndex:        10,
            }}
          >
            Adaptive AI Learning Engine
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Flash ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            style={{
              position:      "absolute",
              inset:         0,
              background:    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(139,92,246,0.5) 55%, transparent 100%)",
              pointerEvents: "none",
              zIndex:        22,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Shockwave glow ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShockwave && (
          <motion.div
            key="sw-glow"
            initial={{ scale: 0, opacity: 0.85 }}
            animate={{ scale: 22, opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position:     "absolute",
              top:          "50%",
              left:         "50%",
              width:        "100px",
              height:       "100px",
              marginLeft:   "-50px",
              marginTop:    "-50px",
              borderRadius: "50%",
              background:   "radial-gradient(circle, rgba(139,92,246,0.85) 0%, rgba(99,102,241,0.4) 45%, transparent 70%)",
              filter:       "blur(14px)",
              pointerEvents:"none",
              zIndex:       18,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Shockwave ring ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShockwave && (
          <motion.div
            key="sw-ring"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 24, opacity: 0 }}
            transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position:     "absolute",
              top:          "50%",
              left:         "50%",
              width:        "150px",
              height:       "150px",
              marginLeft:   "-75px",
              marginTop:    "-75px",
              borderRadius: "50%",
              border:       "1.5px solid rgba(139,92,246,0.95)",
              pointerEvents:"none",
              zIndex:       19,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Sign In button ─────────────────────────────────────────────────── */}
      <div
        style={{
          position:       "absolute",
          bottom:         "72px",
          left:           0,
          right:          0,
          display:        "flex",
          justifyContent: "center",
          zIndex:         10,
        }}
      >
        <AnimatePresence>
          {btnVisible && (
            <motion.button
              key="btn"
              onClick={handleSignIn}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.18 } }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                width:         "220px",
                height:        "56px",
                borderRadius:  "16px",
                background:    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
                border:        "none",
                color:         "white",
                fontSize:      "15px",
                fontWeight:    600,
                fontFamily:    "'Space Grotesk', system-ui",
                letterSpacing: "0.05em",
                cursor:        "pointer",
                overflow:      "hidden",
                position:      "relative",
                boxShadow:     btnHover
                  ? "0 0 50px rgba(99,102,241,0.85), 0 0 90px rgba(139,92,246,0.3), 0 8px 30px rgba(0,0,0,0.5)"
                  : "0 0 30px rgba(99,102,241,0.5), 0 4px 20px rgba(0,0,0,0.4)",
                transition:    "box-shadow 0.3s ease",
              }}
            >
              Sign In

              <AnimatePresence>
                {btnHover && (
                  <motion.div
                    key="shimmer"
                    initial={{ x: "-120%" }}
                    animate={{ x: "220%" }}
                    transition={{ duration: 0.6, ease: "linear" }}
                    style={{
                      position:      "absolute",
                      inset:         0,
                      background:    "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Final fade ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFade && (
          <motion.div
            key="fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              position:      "absolute",
              inset:         0,
              background:    BG,
              pointerEvents: "none",
              zIndex:        32,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

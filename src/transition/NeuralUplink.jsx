import { motion, AnimatePresence } from 'framer-motion'
import { useTransition } from './TransitionContext'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BEAM_COUNT = 10

const COLORS = {
  indigo: '#6366F1',
  purple: '#8B5CF6',
  bg: '#020617',
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function CoreGlow({ phase }) {
  const isIntense  = phase === 'intense'
  const isCollapse = phase === 'collapse'
  const isWaiting  = phase === 'waiting'

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Outer soft radial glow */}
      <motion.div
        className="absolute rounded-full"
        style={{ background: `radial-gradient(circle, ${COLORS.purple}22 0%, transparent 70%)` }}
        animate={{
          width:   isCollapse ? 60  : isIntense || isWaiting ? 420 : 320,
          height:  isCollapse ? 60  : isIntense || isWaiting ? 420 : 320,
          opacity: isCollapse ? 0   : isWaiting ? [1, 0.6, 1] : 1,
        }}
        transition={{
          duration:   isCollapse ? 0.35 : isWaiting ? 2.4 : 0.6,
          repeat:     isWaiting ? Infinity : 0,
          ease:       'easeInOut',
        }}
      />

      {/* Mid glow */}
      <motion.div
        className="absolute rounded-full blur-xl"
        style={{ background: `radial-gradient(circle, ${COLORS.indigo}44 0%, transparent 60%)` }}
        animate={{
          width:   isCollapse ? 30  : isIntense || isWaiting ? 240 : 160,
          height:  isCollapse ? 30  : isIntense || isWaiting ? 240 : 160,
          opacity: isCollapse ? 0   : isWaiting ? [0.9, 0.5, 0.9] : 0.9,
        }}
        transition={{
          duration: isCollapse ? 0.3 : isWaiting ? 2.0 : 0.5,
          repeat:   isWaiting ? Infinity : 0,
          ease:     'easeInOut',
        }}
      />

      {/* Core orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 40%, #ffffff55, ${COLORS.indigo} 40%, ${COLORS.purple} 100%)`,
          boxShadow: `0 0 40px 12px ${COLORS.indigo}88, 0 0 80px 24px ${COLORS.purple}44`,
        }}
        animate={{
          width:   isCollapse ? 8  : isIntense || isWaiting ? 72 : 52,
          height:  isCollapse ? 8  : isIntense || isWaiting ? 72 : 52,
          opacity: isCollapse ? 0  : 1,
          scale:   isCollapse ? 0.1 : isWaiting ? [1, 0.88, 1] : 1,
        }}
        transition={{
          duration: isCollapse ? 0.28 : isWaiting ? 1.6 : 0.5,
          repeat:   isWaiting ? Infinity : 0,
          ease:     isCollapse ? [0.6, 0, 0.8, 1] : 'easeInOut',
        }}
      />

      {/* Pulse waves */}
      {(phase === 'uplink' || phase === 'intense' || phase === 'waiting') && (
        <>
          {[0, 0.45, 0.9].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{ borderColor: `${COLORS.indigo}33` }}
              initial={{ width: 60, height: 60, opacity: 0.7 }}
              animate={{
                width:   isWaiting ? 220 : isIntense ? 300 : 200,
                height:  isWaiting ? 220 : isIntense ? 300 : 200,
                opacity: 0,
              }}
              transition={{
                duration:   isWaiting ? 1.8 : isIntense ? 1.0 : 1.4,
                delay,
                repeat:     Infinity,
                ease:       'easeOut',
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

function OrbitRings({ phase }) {
  const isIntense  = phase === 'intense'
  const isCollapse = phase === 'collapse'
  const isWaiting  = phase === 'waiting'

  const rings = [
    { size: 120, duration: isIntense || isWaiting ? 2.4 : 4.5, opacity: 0.5, reverse: false },
    { size: 180, duration: isIntense || isWaiting ? 3.2 : 6.0, opacity: 0.3, reverse: true  },
    { size: 240, duration: isIntense || isWaiting ? 4.0 : 8.0, opacity: 0.2, reverse: false },
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {rings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width:  ring.size,
            height: ring.size,
            border: `1px solid ${COLORS.indigo}`,
          }}
          animate={{
            rotate:  ring.reverse ? -360 : 360,
            scale:   isCollapse ? 0 : 1,
            opacity: isCollapse ? 0 : ring.opacity,
          }}
          transition={{
            rotate:  { duration: ring.duration, repeat: Infinity, ease: 'linear' },
            scale:   { duration: 0.3, ease: 'easeIn' },
            opacity: { duration: 0.3 },
          }}
        />
      ))}
    </div>
  )
}

function LightBeams({ phase }) {
  const isIntense  = phase === 'intense'
  const isCollapse = phase === 'collapse'
  const isWaiting  = phase === 'waiting'

  const beams = Array.from({ length: BEAM_COUNT }, (_, i) => ({
    angle: (360 / BEAM_COUNT) * i,
    delay: i * 0.09,
  }))

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {beams.map(({ angle, delay }, i) => (
        <motion.div
          key={i}
          className="absolute origin-bottom"
          style={{
            width: 1.5,
            bottom: '50%',
            left: 'calc(50% - 0.75px)',
            transformOrigin: 'bottom center',
            rotate: angle,
          }}
          initial={{ height: 0, opacity: 0 }}
          animate={
            isCollapse
              ? { height: 0, opacity: 0, scaleX: 3 }
              : isWaiting
              ? {
                  height: [220, 180, 220],
                  opacity: [0.8, 0.4, 0.8],
                  scaleX: 1,
                }
              : isIntense
              ? { height: 260, opacity: [0.6, 1, 0.6], scaleX: 1.5 }
              : { height: 160, opacity: [0, 0.7, 0.5], scaleX: 1 }
          }
          transition={
            isCollapse
              ? { duration: 0.28, ease: [0.6, 0, 1, 0.5] }
              : isWaiting
              ? { duration: 2.0, repeat: Infinity, repeatType: 'mirror', delay: delay * 0.5, ease: 'easeInOut' }
              : { duration: 0.6, delay, opacity: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay } }
          }
        >
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(to top, ${COLORS.indigo}dd, ${COLORS.purple}88, transparent)`,
            }}
          />
        </motion.div>
      ))}
    </div>
  )
}

function WhiteFlash({ phase }) {
  return (
    <AnimatePresence>
      {phase === 'collapse' && (
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 0.85, 0] }}
          transition={{ duration: 0.45, times: [0, 0.5, 0.75, 1], ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  )
}

function StatusText({ phase }) {
  const labels = {
    uplink:   'INITIALIZING NEURAL UPLINK',
    intense:  'PROCESSING DATA STREAMS',
    collapse: 'RENDERING DASHBOARD',
    waiting:  'FETCHING LIVE DATA',
  }
  const label = labels[phase]

  return (
    <AnimatePresence mode="wait">
      {label && (
        <motion.div
          key={phase}
          className="absolute bottom-[calc(50%-80px)] left-0 right-0 flex flex-col items-center gap-2 pointer-events-none"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35 }}
        >
          <span
            className="text-[10px] tracking-[0.3em] font-mono uppercase"
            style={{ color: `${COLORS.indigo}cc` }}
          >
            {label}
          </span>

          {/* Animated dots shown only during waiting */}
          {phase === 'waiting' && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: COLORS.indigo }}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export default function NeuralUplink() {
  const { phase, isVisible } = useTransition()

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center"
          style={{ background: COLORS.bg }}
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: phase === 'reveal' ? 0.7 : 0, ease: 'easeInOut' }}
        >
          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '200px 200px',
            }}
          />

          <LightBeams phase={phase} />
          <OrbitRings phase={phase} />
          <CoreGlow phase={phase} />
          <WhiteFlash phase={phase} />
          <StatusText phase={phase} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

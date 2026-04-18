import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getCourseById } from '../utils/loadCourseData.js'
import { getRoadmap, getRoadmapProgress, getCoursePreferences, updateRoadmapProgress } from '../utils/api.js'

// ─── Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function seededRandom(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return (Math.abs(hash) % 1000) / 1000
}

function getNodePosition(index, total, topicName) {
  if (total <= 1) return { x: 50, y: 50 }
  const jitterX = (seededRandom(topicName + 'x') - 0.5) * 6
  const jitterY = (seededRandom(topicName + 'y') - 0.5) * 6
  let x, y
  if (index === 0) {
    x = 15
    y = 50
  } else if (index === total - 1) {
    x = 88
    y = 50
  } else {
    x = 15 + (index / (total - 1)) * 73
    y = 50 + Math.sin(index * 1.3) * 25
  }
  return {
    x: Math.max(8, Math.min(92, x + jitterX)),
    y: Math.max(12, Math.min(88, y + jitterY)),
  }
}

function getNodeState(topic, progress) {
  const subtopics = topic.subtopics || []
  if (subtopics.length === 0) return 'IDLE'
  const completedCount = subtopics.filter(st => {
    const key = `${topic.name}::${st.name}`
    return progress[key] === true
  }).length
  if (completedCount === subtopics.length) return 'COMPLETE'
  if (completedCount > 0) return 'IN_PROGRESS'
  return 'IDLE'
}

function getTopicCompletion(topic, progress) {
  const subtopics = topic.subtopics || []
  if (subtopics.length === 0) return { completed: 0, total: 0, pct: 0 }
  const completed = subtopics.filter(st => progress[`${topic.name}::${st.name}`] === true).length
  return { completed, total: subtopics.length, pct: completed / subtopics.length }
}

// ─── SVG Icons ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Loading Neural Sketch ━━━━━━━━━━━━━━━━━
function NeuralSketchSVG() {
  const nodes = [
    { cx: 60, cy: 50 }, { cx: 140, cy: 30 }, { cx: 140, cy: 70 },
    { cx: 220, cy: 40 }, { cx: 220, cy: 60 },
  ]
  const lines = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 4],
  ]
  return (
    <svg width="280" height="100" viewBox="0 0 280 100" fill="none">
      {lines.map(([a, b], i) => (
        <motion.line
          key={`line-${i}`}
          x1={nodes[a].cx} y1={nodes[a].cy}
          x2={nodes[b].cx} y2={nodes[b].cy}
          stroke="rgba(99,102,241,0.4)"
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease: 'easeInOut' }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={`node-${i}`}
          cx={n.cx} cy={n.cy} r="8"
          fill="rgba(99,102,241,0.15)"
          stroke="#6366f1"
          strokeWidth="1.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{
            delay: i * 0.2,
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </svg>
  )
}

// ─── Typewriter ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TYPEWRITER_PHRASES = [
  "Mapping your knowledge graph…",
  "Identifying skill dependencies…",
  "Calculating optimal learning path…",
  "Sequencing topic difficulty curve…",
  "Your roadmap is ready",
]

function TypewriterText() {
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [pausing, setPausing] = useState(false)

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[phraseIdx]
    if (!phrase) return

    if (charIdx < phrase.length && !pausing) {
      const timer = setTimeout(() => setCharIdx(c => c + 1), 35)
      return () => clearTimeout(timer)
    }
    if (charIdx >= phrase.length && !pausing) {
      setPausing(true)
      const timer = setTimeout(() => {
        setPausing(false)
        setCharIdx(0)
        setPhraseIdx(i => (i + 1) % TYPEWRITER_PHRASES.length)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [charIdx, phraseIdx, pausing])

  const phrase = TYPEWRITER_PHRASES[phraseIdx] || ''
  const display = phrase.slice(0, charIdx)

  return (
    <p style={{
      fontFamily: "'Space Grotesk', system-ui",
      fontSize: '16px',
      fontWeight: 500,
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: '0.02em',
      minHeight: '24px',
      textAlign: 'center',
    }}>
      {display}
      <span style={{ opacity: 0.5, animation: 'loading-dot 1s infinite' }}>|</span>
    </p>
  )
}

// ─── Loading Screen ━━━━━━━━━━━━━━━━━━━━━━━━
function LoadingScreen({ progress: loadProgress }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      style={{
        position: 'fixed', inset: 0, background: '#06080f', zIndex: 50,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <NeuralSketchSVG />
      <div style={{ marginTop: '40px' }}>
        <TypewriterText />
      </div>
      <div style={{
        width: '400px', maxWidth: '80vw', height: '2px', borderRadius: '1px',
        background: 'rgba(255,255,255,0.06)', marginTop: '32px', overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${loadProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 8px rgba(99,102,241,0.8)',
            borderRadius: '1px',
          }}
        />
      </div>
    </motion.div>
  )
}

// ─── Progress Arc SVG ━━━━━━━━━━━━━━━━━━━━━━
function ProgressArc({ pct, state, size = 80 }) {
  const r = (size / 2) - 4
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)

  const colorMap = {
    IDLE: 'rgba(255,255,255,0.1)',
    IN_PROGRESS: 'rgba(99,102,241,0.6)',
    ACTIVE: 'rgba(99,102,241,0.8)',
    COMPLETE: 'rgba(34,197,94,0.6)',
  }

  return (
    <svg
      width={size} height={size}
      style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="2"
      />
      {pct > 0 && (
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={colorMap[state] || colorMap.IDLE}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

// ─── Graph Node ━━━━━━━━━━━━━━━━━━━━━━━━
function GraphNode({ topic, index, position, state, completion, isActive, onClick, nodeSize }) {
  const stateStyles = {
    IDLE: {
      background: 'rgba(255,255,255,0.03)',
      border: '1.5px solid rgba(255,255,255,0.1)',
      color: 'rgba(255,255,255,0.3)',
      boxShadow: 'none',
    },
    IN_PROGRESS: {
      background: 'rgba(99,102,241,0.12)',
      border: '1.5px solid rgba(99,102,241,0.5)',
      color: '#a5b4fc',
      boxShadow: '0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1)',
    },
    ACTIVE: {
      background: 'rgba(99,102,241,0.18)',
      border: '2px solid rgba(99,102,241,0.8)',
      color: '#c7d2fe',
      boxShadow: '0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2)',
      animation: 'node-pulse 2s ease-in-out infinite',
    },
    COMPLETE: {
      background: 'rgba(34,197,94,0.12)',
      border: '1.5px solid rgba(34,197,94,0.5)',
      color: '#86efac',
      boxShadow: '0 0 20px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.1)',
    },
  }

  const currentState = isActive ? 'ACTIVE' : state
  const style = stateStyles[currentState]

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.15 : 1,
        opacity: 1,
      }}
      transition={{
        delay: index * 0.12,
        duration: 0.6,
        type: 'spring',
        stiffness: 200,
        damping: 18,
      }}
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: isActive ? 25 : 15,
      }}
    >
      {/* Active ring animation */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${nodeSize + 20}px`, height: `${nodeSize + 20}px`,
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.3)',
          animation: 'ring-expand 2s ease-out infinite',
        }} />
      )}

      {/* Node circle */}
      <div
        style={{
          width: `${nodeSize}px`,
          height: `${nodeSize}px`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          position: 'relative',
          ...style,
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s',
        }}
      >
        <ProgressArc pct={completion.pct} state={currentState} size={nodeSize} />
        <span style={{ position: 'relative', zIndex: 2 }}>
          {state === 'COMPLETE' ? (
            <CheckIcon size={nodeSize * 0.28} />
          ) : (
            <span style={{
              fontSize: `${nodeSize * 0.15}px`,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              opacity: 0.6,
            }}>
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </span>
      </div>

      {/* Label below */}
      <div style={{
        position: 'absolute',
        top: `calc(100% + 10px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255,255,255,0.55)',
        whiteSpace: 'nowrap',
        fontFamily: "'Space Grotesk', system-ui",
        textAlign: 'center',
        maxWidth: '100px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {topic.name}
      </div>
    </motion.div>
  )
}

// ─── Mobile Node (vertical list) ━━━━━━━━━━━━━━━━━━━━━━━
function MobileNode({ topic, index, state, completion, isActive, onClick }) {
  const stateColors = {
    IDLE: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.3)' },
    IN_PROGRESS: { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.5)', text: '#a5b4fc' },
    ACTIVE: { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.8)', text: '#c7d2fe' },
    COMPLETE: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.5)', text: '#86efac' },
  }
  const currentState = isActive ? 'ACTIVE' : state
  const colors = stateColors[currentState]

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px', cursor: 'pointer',
        background: isActive ? colors.bg : 'transparent',
        borderRadius: '12px',
        transition: 'background 0.2s',
      }}
    >
      {/* Node circle */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.bg, border: `1.5px solid ${colors.border}`,
        color: colors.text, position: 'relative',
      }}>
        <ProgressArc pct={completion.pct} state={currentState} size={48} />
        <span style={{ position: 'relative', zIndex: 2 }}>
          {state === 'COMPLETE' ? <CheckIcon size(16} /> : (
            <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", opacity: 0.6 }}>
              {String(index + 1).padStart(2, '0')}
            </span>
          )}
        </span>
      </div>

      {/* Line connector */}
      {index > 0 && (
        <div style={{
          position: 'absolute', left: '40px', top: '-12px', width: '1px', height: '12px',
          background: state === 'COMPLETE' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
        }} />
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 600, color: colors.text,
          fontFamily: "'Space Grotesk', system-ui",
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {topic.name}
        </div>
        <div style={{
          fontSize: '12px', color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Space Grotesk', system-ui", marginTop: '2px',
        }}>
          {completion.completed}/{completion.total} subtopics
        </div>
      </div>

      {/* Progress percentage */}
      <span style={{
        fontSize: '13px', fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        color: colors.text,
      }}>
        {Math.round(completion.pct * 100)}%
      </span>
    </motion.div>
  )
}

// ─── SVG Connecting Lines ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ConnectingLines({ topics, positions, progress, activeIdx }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      {topics.slice(0, -1).map((topic, i) => {
        const a = positions[i]
        const b = positions[i + 1]
        if (!a || !b) return null

        const cx = (a.x + b.x) / 2
        const cy = (a.y + b.y) / 2 - 8
        const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`

        const stateA = getNodeState(topic, progress)
        const stateB = getNodeState(topics[i + 1], progress)

        let stroke = 'rgba(255,255,255,0.06)'
        let filter = 'none'
        if (stateA === 'COMPLETE' && stateB === 'COMPLETE') {
          stroke = 'rgba(34,197,94,0.4)'
          filter = 'drop-shadow(0 0 4px rgba(34,197,94,0.6))'
        } else if (stateA === 'IN_PROGRESS' || stateA === 'COMPLETE' || i === activeIdx || i + 1 === activeIdx) {
          stroke = 'rgba(99,102,241,0.35)'
          filter = 'drop-shadow(0 0 4px rgba(99,102,241,0.5))'
        }

        return (
          <g key={`line-${i}`}>
            {/* Background line */}
            <path d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
            {/* Animated line */}
            <motion.path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth="0.3"
              style={{ filter }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { delay: i * 0.12 + 0.4, duration: 0.7, ease: 'easeInOut' },
                opacity: { delay: i * 0.12 + 0.4, duration: 0.3 },
              }}
            />
            {/* Traveling particle on active lines */}
            {(stateA === 'IN_PROGRESS' || i === activeIdx) && stroke !== 'rgba(255,255,255,0.06)' && (
              <motion.circle
                r="0.5"
                fill="#818cf8"
                initial={{ offsetDistance: '0%' }}
                animate={{ offsetDistance: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ offsetPath: `path("${d}")` }}
              >
                <animateMotion
                  dur="3s"
                  repeatCount="indefinite"
                  path={d}
                />
              </motion.circle>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ─── Detail Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━
function DetailPanel({ topic, cid, progress, onClose, onToggleSubtopic, roadmapType }) {
  if (!topic) return null
  const completion = getTopicCompletion(topic, progress)

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', right: 0, top: '60px', bottom: 0,
        width: '380px', maxWidth: '100vw',
        background: 'rgba(8,10,20,0.95)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(99,102,241,0.2)',
        zIndex: 40, padding: '28px',
        overflowY: 'auto',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', padding: '4px',
        }}
      >
        <CloseIcon />
      </button>

      {/* Topic name */}
      <h2 style={{
        fontSize: '20px', fontWeight: 700, color: 'white',
        fontFamily: "'Space Grotesk', system-ui", paddingRight: '32px',
      }}>
        {topic.name}
      </h2>

      {/* Progress fraction */}
      <p style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px',
        fontFamily: "'Space Grotesk', system-ui",
      }}>
        {completion.completed} of {completion.total} subtopics completed
      </p>

      {/* Progress bar */}
      <div style={{
        width: '100%', height: '4px', borderRadius: '2px',
        background: 'rgba(255,255,255,0.06)', marginTop: '16px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          width: `${completion.pct * 100}%`,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          boxShadow: '0 0 8px rgba(99,102,241,0.7), 0 0 16px rgba(99,102,241,0.3)',
          transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
        }} />
      </div>

      {/* Subtopic list */}
      <div style={{ marginTop: '24px' }}>
        {(topic.subtopics || []).map((subtopic, i) => {
          const key = `${topic.name}::${subtopic.name}`
          const isCompleted = progress[key] === true

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}
            >
              {/* Indicator */}
              <div
                onClick={() => !isCompleted && onToggleSubtopic(topic.name, subtopic.name)}
                style={{
                  width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isCompleted ? 'default' : 'pointer',
                  ...(isCompleted ? {
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    color: '#4ade80',
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }),
                }}
              >
                {isCompleted && <CheckIcon size={12} />}
              </div>

              {/* Subtopic name */}
              <span style={{
                flex: 1, fontSize: '14px',
                fontFamily: "'Space Grotesk', system-ui",
                color: isCompleted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)',
                textDecoration: isCompleted ? 'line-through' : 'none',
              }}>
                {subtopic.name}
              </span>

              {/* Action */}
              <span style={{
                fontSize: '12px', fontWeight: 500,
                fontFamily: "'Space Grotesk', system-ui",
                color: isCompleted ? 'rgba(34,197,94,0.6)' : '#818cf8',
                whiteSpace: 'nowrap',
              }}>
                {isCompleted ? '✓ Done' : 'Start →'}
              </span>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Main Roadmap Page ━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RoadmapPage() {
  const { course: courseIdParam } = useParams()
  const navigate = useNavigate()
  const cid = parseInt(courseIdParam, 10)

  const [course, setCourse] = useState(null)
  const [roadmapData, setRoadmapData] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [progress, setProgress] = useState({})
  const [totalXP, setTotalXP] = useState(0)
  const [loadError, setLoadError] = useState(null)
  const [activeTopicIdx, setActiveTopicIdx] = useState(null)
  const [showLoading, setShowLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const canvasRef = useRef(null)

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Progress animation for loading
  useEffect(() => {
    if (!loading) return
    const steps = [10, 25, 40, 55, 70, 85]
    let i = 0
    const timer = setInterval(() => {
      if (i < steps.length) {
        setLoadProgress(steps[i])
        i++
      }
    }, 400)
    return () => clearInterval(timer)
  }, [loading])

  // Data loading
  useEffect(() => {
    async function loadData() {
      if (!cid || isNaN(cid)) {
        navigate('/roadmap-engine/courses')
        return
      }

      setLoading(true)
      setLoadError(null)

      try {
        const courseInfo = await getCourseById(cid)
        if (!courseInfo) {
          navigate('/roadmap-engine/courses')
          return
        }
        setCourse(courseInfo)
        setLoadProgress(30)

        const prefs = await getCoursePreferences(cid)
        if (!prefs || !prefs.lm) {
          navigate(`/roadmap-engine/setup/${cid}`)
          return
        }
        setSettings({
          roadmapType: prefs.lm,
          goalDeadline: prefs.goal_date,
          weeklyHours: prefs.hrs_per_week,
        })
        setLoadProgress(50)

        const roadmap = await getRoadmap(cid, prefs.lm)
        if (!roadmap || !roadmap.topics) {
          throw new Error('Invalid roadmap data received')
        }

        setRoadmapData({
          courseName: roadmap.course_name,
          estimatedHours: roadmap.estimated_hours,
          topics: roadmap.topics,
          totalTopics: roadmap.total_topics,
          completedTopics: roadmap.completed_topics,
          completionPercentage: roadmap.completion_percentage,
        })
        setProgress(roadmap.progress || {})
        setTotalXP(roadmap.completed_topics * 10)
        setLoadProgress(100)

        // Keep loading screen briefly after data loads
        setTimeout(() => setShowLoading(false), 800)
      } catch (error) {
        setLoadError(error.message || 'Failed to load roadmap.')
        setShowLoading(false)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [cid, navigate])

  const filteredTopics = roadmapData?.topics || []

  const positions = useMemo(() => {
    return filteredTopics.map((t, i) => getNodePosition(i, filteredTopics.length, t.name))
  }, [filteredTopics])

  const totalSubtopics = filteredTopics.reduce((t, topic) => t + (topic.subtopics?.length || 0), 0)
  const completedSubtopics = Object.values(progress).filter(v => v === true).length
  const overallProgress = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0
  const topicsRemaining = filteredTopics.filter(t => getNodeState(t, progress) !== 'COMPLETE').length

  const handleToggleSubtopic = useCallback(async (topicName, subtopicName) => {
    const topicKey = `${topicName}::${subtopicName}`
    try {
      await updateRoadmapProgress(cid, topicKey, true)
      setProgress(prev => ({ ...prev, [topicKey]: true }))
      setTotalXP(prev => prev + 10)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }, [cid])

  const handleRefreshProgress = useCallback(async () => {
    try {
      const roadmapType = settings?.roadmapType || 'PNL'
      const updatedProgress = await getRoadmapProgress(cid, roadmapType)
      setProgress(updatedProgress.progress || {})
      setTotalXP(updatedProgress.completed_topics * 10)
      setRoadmapData(prev => prev ? ({
        ...prev,
        completedTopics: updatedProgress.completed_topics,
        completionPercentage: updatedProgress.completion_percentage,
      }) : prev)
    } catch (error) {
      console.error('Failed to refresh progress:', error)
    }
  }, [cid, settings])

  // ─── Error state ━━━━━━━━━━━━━━━━━
  if (loadError && !loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#06080f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', fontFamily: "'Space Grotesk', system-ui",
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            fontSize: '28px',
          }}>
            ⚠
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
            Failed to Load Roadmap
          </h3>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
            {loadError}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/roadmap-engine/courses')}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px',
                fontFamily: "'Space Grotesk', system-ui",
              }}
            >
              Back to Courses
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: 'none', background: '#6366f1',
                color: 'white', cursor: 'pointer', fontSize: '14px',
                fontFamily: "'Space Grotesk', system-ui",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!course || !roadmapData) {
    return (
      <AnimatePresence>
        {showLoading && <LoadingScreen progress={loadProgress} />}
      </AnimatePresence>
    )
  }

  const activeTopic = activeTopicIdx !== null ? filteredTopics[activeTopicIdx] : null
  const nodeSize = isMobile ? 64 : 80

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ duration: 0.4 }}
      style={{ background: '#06080f', minHeight: '100vh', overflow: 'hidden' }}
    >
      {/* Loading overlay */}
      <AnimatePresence>
        {showLoading && <LoadingScreen progress={loadProgress} />}
      </AnimatePresence>

      {/* Ambient glow at top */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '400px',
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Sticky Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(6,8,15,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '60px', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Back button */}
          <button
            onClick={() => navigate('/roadmap-engine/courses')}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            }}
          >
            <ArrowLeftIcon />
          </button>

          {/* Course name */}
          <span style={{
            fontFamily: "'Space Grotesk', system-ui",
            fontWeight: 700, fontSize: '16px', color: 'white',
          }}>
            {roadmapData.courseName || course.name}
          </span>

          {/* Mode badge */}
          <span style={{
            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            fontFamily: "'Space Grotesk', system-ui", letterSpacing: '0.04em',
            ...(settings?.roadmapType === 'PRACTICE' ? {
              background: 'rgba(20,184,166,0.15)', color: '#2dd4bf',
              border: '1px solid rgba(20,184,166,0.3)',
            } : {
              background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.3)',
            }),
          }}>
            {settings?.roadmapType === 'PRACTICE' ? 'PRACTICE' : 'PNL'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* XP chip */}
          <div style={{
            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)',
            color: '#fde047', padding: '6px 12px', borderRadius: '20px',
            fontSize: '13px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontSize: '14px' }}>⚡</span>
            {totalXP} XP
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate(`/roadmap-engine/setup/${cid}`)}
            style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            }}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Progress Overview Bar */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        <div style={{
          height: '3px', background: 'rgba(255,255,255,0.04)', position: 'relative',
        }}>
          <div style={{
            height: '100%',
            width: `${overallProgress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)',
            boxShadow: '0 0 8px rgba(99,102,241,0.7), 0 0 16px rgba(99,102,241,0.3)',
            transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 24px',
        }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Space Grotesk', system-ui" }}>
            {Math.round(overallProgress)}% completed
          </span>
          <span style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {Math.round(overallProgress)}%
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Space Grotesk', system-ui" }}>
            {topicsRemaining} topics remaining
          </span>
        </div>
      </div>

      {/* Neural Graph Canvas / Mobile List */}
      {isMobile ? (
        /* Mobile: Vertical scrollable list */
        <div style={{ padding: '16px', overflowY: 'auto', height: 'calc(100vh - 100px)' }}>
          {filteredTopics.map((topic, i) => {
            const state = getNodeState(topic, progress)
            const completion = getTopicCompletion(topic, progress)
            return (
              <MobileNode
                key={i}
                topic={topic}
                index={i}
                state={state}
                completion={completion}
                isActive={activeTopicIdx === i}
                onClick={() => setActiveTopicIdx(activeTopicIdx === i ? null : i)}
              />
            )
          })}
          {filteredTopics.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Grotesk', system-ui" }}>
              No topics available
            </div>
          )}
        </div>
      ) : (
        /* Desktop: Neural graph scatter layout */
        <div
          ref={canvasRef}
          style={{
            position: 'relative', width: '100%',
            height: 'calc(100vh - 60px)', overflow: 'hidden',
          }}
        >
          {/* SVG lines layer */}
          <ConnectingLines
            topics={filteredTopics}
            positions={positions}
            progress={progress}
            activeIdx={activeTopicIdx}
          />

          {/* Nodes */}
          {filteredTopics.map((topic, i) => {
            const state = getNodeState(topic, progress)
            const completion = getTopicCompletion(topic, progress)
            return (
              <GraphNode
                key={i}
                topic={topic}
                index={i}
                position={positions[i]}
                state={state}
                completion={completion}
                isActive={activeTopicIdx === i}
                onClick={() => setActiveTopicIdx(activeTopicIdx === i ? null : i)}
                nodeSize={nodeSize}
              />
            )
          })}

          {/* Empty state */}
          {filteredTopics.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)', fontFamily: "'Space Grotesk', system-ui",
              fontSize: '16px',
            }}>
              No topics available
            </div>
          )}
        </div>
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {activeTopic && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTopicIdx(null)}
              style={{
                position: 'fixed', inset: 0, zIndex: 35,
                background: 'rgba(0,0,0,0.3)',
              }}
            />
            <DetailPanel
              topic={activeTopic}
              cid={cid}
              progress={progress}
              onClose={() => setActiveTopicIdx(null)}
              onToggleSubtopic={handleToggleSubtopic}
              roadmapType={settings?.roadmapType}
            />
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 25px rgba(99,102,241,0.4), 0 0 50px rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 40px rgba(99,102,241,0.65), 0 0 80px rgba(99,102,241,0.25); }
        }
        @keyframes ring-expand {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
        @keyframes loading-dot {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  )
}

export default RoadmapPage
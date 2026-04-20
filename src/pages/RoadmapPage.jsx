import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Settings, X, Check } from 'lucide-react'
import { getCourseById } from '../utils/loadCourseData.js'
import { getRoadmap, getRoadmapProgress, getCoursePreferences, updateRoadmapProgress } from '../utils/api.js'

// ─── Neural Network Loading Screen ───────────────────────────────────────────
function NeuralNetworkLoader({ isComplete }) {
  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#06080f',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          // FIX: exit animation so it fades out when isComplete becomes true
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Animated Neural Network SVG */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ marginBottom: '40px' }}>
            {[
              { cx: 60, cy: 20, delay: 0 },
              { cx: 25, cy: 60, delay: 0.2 },
              { cx: 60, cy: 75, delay: 0.4 },
              { cx: 95, cy: 60, delay: 0.6 },
              { cx: 60, cy: 110, delay: 0.8 },
            ].map((circle, idx) => (
              <motion.circle
                key={idx}
                cx={circle.cx}
                cy={circle.cy}
                r="6"
                fill="rgba(99,102,241,0.7)"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: circle.delay }}
              />
            ))}
            {[
              { x1: 60, y1: 20, x2: 25,  y2: 60 },
              { x1: 60, y1: 20, x2: 95,  y2: 60 },
              { x1: 25, y1: 60, x2: 60,  y2: 75 },
              { x1: 95, y1: 60, x2: 60,  y2: 75 },
              { x1: 60, y1: 75, x2: 60,  y2: 110 },
            ].map((line, idx) => (
              <motion.line
                key={`line-${idx}`}
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                stroke="rgba(99,102,241,0.35)"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, opacity: [0.2, 0.7, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, delay: idx * 0.15 }}
              />
            ))}
          </svg>

          <TypewriterText />

          {/* Progress bar */}
          <div style={{
            width: '300px', height: '2px', background: 'rgba(255,255,255,0.06)',
            borderRadius: '1px', marginTop: '28px', overflow: 'hidden', maxWidth: '80vw',
          }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,0.8)' }}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}


// ─── Typewriter ───────────────────────────────────────────────────────────────
function TypewriterText() {
  const phrases = [
    'Mapping your knowledge graph…',
    'Identifying skill dependencies…',
    'Calculating optimal learning path…',
    'Sequencing topic difficulty curve…',
    'Your roadmap is ready',
  ]
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    const phrase = phrases[phraseIdx]
    let i = 0
    setDisplayed('')
    const timer = setInterval(() => {
      i++
      setDisplayed(phrase.slice(0, i))
      if (i >= phrase.length) {
        clearInterval(timer)
        setTimeout(() => setPhraseIdx(p => (p + 1) % phrases.length), 1500)
      }
    }, 35)
    return () => clearInterval(timer)
  }, [phraseIdx])

  return (
    <div style={{
      fontSize: '15px', fontWeight: 500,
      color: 'rgba(255,255,255,0.55)',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      letterSpacing: '0.02em', minHeight: '24px',
    }}>
      {displayed}
      <span style={{ color: '#6366f1', animation: 'blink 1s step-end infinite' }}>|</span>
    </div>
  )
}

// ─── Graph Node ───────────────────────────────────────────────────────────────
function GraphNode({ node, index, isActive, onClick }) {
  const state = node.completionPct === 100 ? 'complete'
    : isActive ? 'active'
    : node.completionPct > 0 ? 'in-progress'
    : 'idle'

  const isComplete = state === 'complete'
  const isIdle = state === 'idle'
  const size = isActive ? 86 : 78
  const styles = {
    idle:          { bg: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.08), rgba(255,255,255,0.025) 58%)', border: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.72)', muted: 'rgba(255,255,255,0.46)', glow: 'none', ring: 'transparent' },
    'in-progress': { bg: 'radial-gradient(circle at 35% 25%, rgba(165,180,252,0.32), rgba(79,70,229,0.14) 58%, rgba(20,24,42,0.9))', border: 'rgba(129,140,248,0.78)', color: '#eef2ff', muted: '#a5b4fc', glow: '0 0 26px rgba(99,102,241,0.42),0 0 54px rgba(99,102,241,0.16)', ring: 'rgba(129,140,248,0.16)' },
    active:        { bg: 'radial-gradient(circle at 35% 25%, rgba(199,210,254,0.36), rgba(99,102,241,0.2) 58%, rgba(17,20,42,0.96))', border: 'rgba(199,210,254,0.92)', color: '#ffffff', muted: '#c7d2fe', glow: '0 0 34px rgba(99,102,241,0.62),0 0 74px rgba(99,102,241,0.24)', ring: 'rgba(129,140,248,0.24)' },
    complete:      { bg: 'radial-gradient(circle at 35% 25%, rgba(134,239,172,0.32), rgba(34,197,94,0.16) 58%, rgba(9,36,24,0.92))', border: 'rgba(74,222,128,0.82)', color: '#dcfce7', muted: '#86efac', glow: '0 0 30px rgba(34,197,94,0.5),0 0 64px rgba(34,197,94,0.18)', ring: 'rgba(34,197,94,0.2)' },
  }
  const s = styles[state]

  return (
    <motion.div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${node.x}%`,
        top: `${node.y}%`,
        transform: 'translate(-50%, -50%)',
        width: size, height: size,
        borderRadius: '50%',
        color: s.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        cursor: 'pointer',
        fontSize: '11px', fontWeight: 800,
        fontFamily: "'JetBrains Mono', monospace",
        // FIX: removed hardcoded opacity: 0.6 — nodes were semi-transparent always
        transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
        zIndex: isActive ? 10 : 2,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.12, duration: 0.6, type: 'spring', stiffness: 200, damping: 18 }}
    >
      {!isIdle && <div style={{ position: 'absolute', inset: -13, borderRadius: '50%', border: `1px solid ${s.ring}`, animation: isActive ? 'ring-pulse-outer 2.2s ease-in-out infinite' : undefined, pointerEvents: 'none' }} />}
      {!isIdle && <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: `1px solid ${s.ring}`, pointerEvents: 'none' }} />}
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: s.bg, border: `${isActive ? '2px' : '1.5px'} solid ${s.border}`, boxShadow: s.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', overflow: 'hidden', animation: isActive ? 'node-pulse 2s ease-in-out infinite' : undefined }}>
        <div style={{ position: 'absolute', top: 7, left: '22%', right: '22%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.36),transparent)', borderRadius: 1 }} />
        {isComplete ? (
          <>
            <Check size={26} strokeWidth={2.7} style={{ filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.9))' }} />
            <span style={{ position: 'absolute', right: 10, top: 9, fontSize: '8px', color: s.muted }}>{String(index + 1).padStart(2, '0')}</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: '11px', color: s.muted, marginBottom: node.completionPct > 0 ? 2 : 0 }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            {node.completionPct > 0 && (
              <span style={{ fontSize: isActive ? '14px' : '12px', lineHeight: 1, color: s.color, textShadow: '0 0 10px rgba(255,255,255,0.35)' }}>
                {node.completionPct}%
              </span>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Node Label (outside circle) ─────────────────────────────────────────────
function NodeLabel({ node, index }) {
  const state = node.completionPct === 100 ? 'complete' : node.completionPct > 0 ? 'in-progress' : 'idle'
  const labelColor = state === 'complete' ? '#dcfce7' : state === 'in-progress' ? '#eef2ff' : 'rgba(255,255,255,0.56)'
  const subColor = state === 'complete' ? '#86efac' : '#a5b4fc'
  const subText = state === 'complete' ? '100%' : state === 'in-progress' ? `${node.completionPct}%` : ''

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: `${node.x}%`,
        top: `calc(${node.y}% + 52px)`,
        transform: 'translateX(-50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        minWidth: '108px',
        maxWidth: '132px',
      }}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12 + 0.5, duration: 0.4 }}
    >
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 9px', borderRadius: 8, background: state === 'idle' ? 'rgba(6,8,15,0.52)' : 'rgba(6,8,15,0.72)', border: state === 'idle' ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(255,255,255,0.08)', boxShadow: state === 'idle' ? 'none' : '0 8px 24px rgba(0,0,0,0.28)', backdropFilter: 'blur(10px)' }}>
        <span style={{ fontSize: '11.5px', lineHeight: 1.15, fontWeight: 700, color: labelColor, fontFamily: "'Space Grotesk', system-ui, sans-serif", textShadow: state === 'idle' ? 'none' : '0 0 12px rgba(255,255,255,0.16)', maxWidth: '112px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        {subText && (
          <span style={{ fontSize: '9.5px', lineHeight: 1, fontWeight: 700, color: subColor, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {subText}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ─── SVG Line ─────────────────────────────────────────────────────────────────
function GraphLine({ fromNode, toNode, index, lineState, W, H }) {
  const NODE_RADIUS_PX = 43

  const ax = (fromNode.x / 100) * W
  const ay = (fromNode.y / 100) * H
  const bx = (toNode.x / 100) * W
  const by = (toNode.y / 100) * H

  const dx = bx - ax
  const dy = by - ay
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  const x1 = ax + ux * NODE_RADIUS_PX
  const y1 = ay + uy * NODE_RADIUS_PX
  const x2 = bx - ux * NODE_RADIUS_PX
  const y2 = by - uy * NODE_RADIUS_PX
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2
  const curve = Math.max(-70, Math.min(70, -dy * 0.18))
  const cpX = midX - uy * 42
  const cpY = midY + ux * curve
  const pathD = `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`
  const gradId = `roadmap-line-grad-${index}`

  // FIX: line state was always 'active' — now correctly derived
  const lineStyles = {
    idle:     { stroke: 'rgba(255,255,255,0.13)', filter: 'none', width: 1.6, marker: 'url(#arrow-idle)' },
    active:   { stroke: `url(#${gradId})`, filter: 'drop-shadow(0 0 5px rgba(129,140,248,0.55))', width: 2.2, marker: 'url(#arrow-active)' },
    complete: { stroke: `url(#${gradId})`, filter: 'drop-shadow(0 0 7px rgba(34,197,94,0.75))', width: 2.6, marker: 'url(#arrow-complete)' },
  }
  const ls = lineStyles[lineState] || lineStyles.idle

  return (
    <g>
      <defs>
        <linearGradient id={gradId} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={lineState === 'complete' ? '#22c55e' : '#4ade80'} stopOpacity="0.9" />
          <stop offset="55%" stopColor={lineState === 'complete' ? '#4ade80' : '#818cf8'} stopOpacity="0.85" />
          <stop offset="100%" stopColor={lineState === 'complete' ? '#86efac' : '#6366f1'} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      {lineState !== 'idle' && (
        <motion.path
          d={pathD}
          strokeWidth={lineState === 'complete' ? 8 : 7}
          fill="none"
          stroke={lineState === 'complete' ? '#22c55e' : '#6366f1'}
          strokeOpacity={lineState === 'complete' ? 0.15 : 0.13}
          style={{ filter: 'blur(6px)' }}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { delay: index * 0.12 + 0.3, duration: 0.85, ease: 'easeInOut' },
            opacity: { delay: index * 0.12 + 0.3, duration: 0.3 },
          }}
        />
      )}
      <motion.path
        d={pathD}
        strokeWidth={ls.width}
        fill="none"
        stroke={ls.stroke}
        strokeDasharray={lineState === 'idle' ? '7 7' : undefined}
        markerEnd={ls.marker}
        style={{ filter: ls.filter }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { delay: index * 0.12 + 0.4, duration: 0.75, ease: 'easeInOut' },
          opacity: { delay: index * 0.12 + 0.4, duration: 0.3 },
        }}
      />
    </g>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ node, cid, settings, onClose, onProgressUpdate }) {
  const navigate = useNavigate()
  const [marking, setMarking] = useState(null)

  const handleMarkComplete = async (e, subtopicName) => {
    // stop click from also triggering the row navigate
    e.stopPropagation()
    if (!cid || !node) return
    const topicKey = `${node.name}::${subtopicName}`
    setMarking(subtopicName)
    try {
      await updateRoadmapProgress(cid, topicKey, true)
      if (onProgressUpdate) onProgressUpdate()
    } catch (err) {
      console.error('Failed to mark complete:', err)
    } finally {
      setMarking(null)
    }
  }

  // Navigate to TopicPage — same state shape TopicAccordion always used
  const handleSubtopicClick = (subtopicObj) => {
    if (!cid || !node) return
    const topicSlug = encodeURIComponent(node.name)
    navigate(`/roadmap-engine/topic/${cid}/${topicSlug}`, {
      state: {
        subtopic: subtopicObj,           // full subtopic object with learningResources + practice
        topic: { name: node.name, subtopics: node.subtopics },
        roadmapType: settings?.roadmapType || 'PNL',
        cid,
      },
    })
  }

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          style={{
            position: 'fixed', right: 0, top: 60, bottom: 0,
            width: '360px', maxWidth: '100vw',
            background: 'rgba(8,10,20,0.97)',
            backdropFilter: 'blur(24px)',
            borderLeft: '1px solid rgba(99,102,241,0.2)',
            zIndex: 40, padding: '28px', overflowY: 'auto',
          }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>

          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', fontFamily: "'Space Grotesk',system-ui", marginBottom: 4, paddingRight: 28 }}>
            {node.name}
          </h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>
            {node.completedCount} of {node.totalCount} subtopics complete
          </p>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${node.completionPct}%`,
              background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7)',
              boxShadow: '0 0 8px rgba(99,102,241,0.7)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Subtopics list */}
          <div>
            {node.subtopics.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No subtopics available</p>
            ) : (
              node.subtopics.map((subtopic, idx) => {
                const subName = typeof subtopic === 'string' ? subtopic : subtopic.name
                // subtopicObj is the full object — needed for navigation state
                const subtopicObj = typeof subtopic === 'string' ? { name: subtopic } : subtopic
                const isDone = node.completedSubtopicNames.includes(subName)

                return (
                  <div
                    key={idx}
                    onClick={() => handleSubtopicClick(subtopicObj)}
                    style={{
                      padding: '11px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Checkbox — click marks complete without navigating */}
                    <button
                      onClick={(e) => !isDone && handleMarkComplete(e, subName)}
                      disabled={isDone || marking === subName}
                      style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: isDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                        border: isDone ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: isDone ? 'default' : 'pointer',
                        color: isDone ? '#4ade80' : 'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isDone && <Check size={12} />}
                      {marking === subName && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                      )}
                    </button>

                    {/* Subtopic name — clicking opens TopicPage */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontSize: 13,
                        color: isDone ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
                        fontFamily: "'Space Grotesk',system-ui",
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}>
                        {subName}
                      </span>
                    </div>

                    {/* Arrow indicator */}
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                      <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main RoadmapPage ─────────────────────────────────────────────────────────
function RoadmapPage() {
  const { course: courseIdParam } = useParams()
  const navigate = useNavigate()
  const cid = parseInt(courseIdParam, 10)

  const [course, setCourse] = useState(null)
  const [roadmapData, setRoadmapData] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({})      // { "TopicName::SubName": true }
  const [loadError, setLoadError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [showGraph, setShowGraph] = useState(false)  // FIX: controls when loader exits
  const canvasRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ W: 0, H: 0 })

  useEffect(() => {
    const measure = () => {
      if (!canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      setCanvasSize({ W: rect.width, H: rect.height })
    }

    measure()
    const ro = new ResizeObserver(measure)
    if (canvasRef.current) ro.observe(canvasRef.current)
    return () => ro.disconnect()
  }, [showGraph])

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadData() {
    if (!cid || isNaN(cid)) { navigate('/roadmap-engine/courses'); return }
    setLoading(true)
    setLoadError(null)

    try {
      const courseInfo = await getCourseById(cid)
      if (!courseInfo) { navigate('/roadmap-engine/courses'); return }
      setCourse(courseInfo)

      const prefs = await getCoursePreferences(cid)
      if (!prefs?.lm) { navigate(`/roadmap-engine/setup/${cid}`); return }

      setSettings({ roadmapType: prefs.lm, goalDeadline: prefs.goal_date, weeklyHours: prefs.hrs_per_week })

      const roadmap = await getRoadmap(cid, prefs.lm)
      if (!roadmap?.topics) throw new Error('Invalid roadmap data received')

      setRoadmapData({
        courseName: roadmap.course_name,
        estimatedHours: roadmap.estimated_hours,
        topics: roadmap.topics,
      })
      setProgress(roadmap.progress || {})
    } catch (err) {
      console.error('[RoadmapPage] load error:', err)
      setLoadError(err.message || 'Failed to load roadmap.')
    } finally {
      setLoading(false)
      // FIX: give loader a moment to complete its bar animation before hiding
      setTimeout(() => setShowGraph(true), 600)
    }
  }

  useEffect(() => { loadData() }, [cid])

  // ── Refresh progress (called after marking subtopics complete) ─────────────
  const handleProgressUpdate = async () => {
    if (!cid || !settings?.roadmapType) return
    try {
      const updated = await getRoadmapProgress(cid, settings.roadmapType)
      setProgress(updated.progress || {})
      // If detail panel is open, refresh selected node data too
      if (selectedNode) setSelectedNode(prev => prev ? { ...prev, _refresh: Date.now() } : null)
    } catch (err) {
      console.error('Progress refresh failed:', err)
    }
  }

  // ── Compute node graph positions ────────────────────────────────────────────
  const graphNodes = useMemo(() => {
    if (!roadmapData?.topics) return []
    const topics = roadmapData.topics
    const total = topics.length

    return topics.map((topic, index) => {
      const x = 12 + (index / Math.max(total - 1, 1)) * 76
      const y = 50 + Math.sin(index * 1.3) * 22

      // Deterministic jitter from topic name
      const seed = topic.name ? topic.name.charCodeAt(0) : index
      const jX = ((seed % 6) - 3) * 0.8
      const jY = ((seed % 7) - 3.5) * 0.8

      // FIX: subtopics are objects — must use sub.name for the progress key
      const subtopics = topic.subtopics || []
      const completedSubtopicNames = subtopics
        .map(s => (typeof s === 'string' ? s : s.name))
        .filter(name => progress[`${topic.name}::${name}`] === true)

      const totalCount = subtopics.length
      const completedCount = completedSubtopicNames.length
      const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      return {
        id: index,
        name: topic.name,
        x: Math.max(8, Math.min(92, x + jX)),
        y: Math.max(15, Math.min(85, y + jY)),
        subtopics,
        totalCount,
        completedCount,
        completedSubtopicNames,
        completionPct,
      }
    })
  }, [roadmapData, progress])

  // ── Sync selectedNode data when progress changes ────────────────────────────
  const enrichedSelectedNode = useMemo(() => {
    if (!selectedNode) return null
    return graphNodes.find(n => n.id === selectedNode.id) || null
  }, [selectedNode, graphNodes])

  // ── Overall progress ────────────────────────────────────────────────────────
  const overallProgress = useMemo(() => {
    if (!graphNodes.length) return 0
    const total = graphNodes.reduce((s, n) => s + n.totalCount, 0)
    const done  = graphNodes.reduce((s, n) => s + n.completedCount, 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  }, [graphNodes])

  // ── Derive correct line state ───────────────────────────────────────────────
  function getLineState(fromNode, toNode) {
    if (fromNode.completionPct === 100) return 'complete'
    if (fromNode.completionPct > 0 || toNode.completionPct > 0) return 'active'
    return 'idle'
  }

  // ── Error screen ───────────────────────────────────────────────────────────
  if (loadError && showGraph) {
    return (
      <div style={{ minHeight: '100vh', background: '#06080f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'white', marginBottom: 12, fontFamily: "'Space Grotesk',system-ui" }}>
            Failed to Load Roadmap
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>{loadError}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/roadmap-engine/courses')}
              style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 10, cursor: 'pointer', fontFamily: "'Space Grotesk',system-ui" }}
            >Back</button>
            <button
              onClick={() => { setShowGraph(false); loadData() }}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', borderRadius: 10, cursor: 'pointer', fontFamily: "'Space Grotesk',system-ui" }}
            >Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06080f', overflow: 'hidden' }}>

      {/* FIX: NeuralNetworkLoader uses AnimatePresence — exits cleanly */}
      <NeuralNetworkLoader isComplete={showGraph} />

      {/* ── Header ── */}
      <header style={{
        background: 'rgba(6,8,15,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)', height: 60,
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/roadmap-engine/courses')}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: 'white', fontFamily: "'Space Grotesk',system-ui", margin: 0 }}>
              {roadmapData?.courseName || course?.name || 'Course'}
            </h1>
            <span style={{ fontSize: 10, color: settings?.roadmapType === 'PRACTICE' ? '#34d399' : '#818cf8', fontFamily: "'Space Grotesk',system-ui", letterSpacing: '0.06em' }}>
              {settings?.roadmapType === 'PRACTICE' ? 'PRACTICE MODE' : 'LEARN + PRACTICE'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.22)', color: '#fde047', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk',system-ui" }}>
            {overallProgress}% complete
          </div>
          <button
            onClick={() => navigate(`/roadmap-engine/setup/${cid}`)}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.55)' }}
          >
            <Settings size={17} />
          </button>
        </div>
      </header>

      {/* ── Progress bar strip ── */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
        <motion.div
          style={{ height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a855f7)', boxShadow: '0 0 8px rgba(99,102,241,0.7)' }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* ── Graph canvas ── */}
      <div ref={canvasRef} style={{ width: '100%', height: 'calc(100vh - 63px)', position: 'relative', overflow: 'hidden' }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        {/* Mobile fallback message */}
        {typeof window !== 'undefined' && window.innerWidth < 640 && graphNodes.length > 0 && (
          <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'Space Grotesk',system-ui", whiteSpace: 'nowrap' }}>
            tap a node to view subtopics
          </div>
        )}

        {/* SVG lines layer */}
        {canvasSize.W > 0 && (
        <svg width={canvasSize.W} height={canvasSize.H} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}>
          <defs>
            <marker id="arrow-complete" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#4ade80" opacity="0.95" />
            </marker>
            <marker id="arrow-active" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="#818cf8" opacity="0.95" />
            </marker>
            <marker id="arrow-idle" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill="rgba(255,255,255,0.2)" />
            </marker>
          </defs>
          {graphNodes.map((node, idx) => {
            if (idx === 0) return null
            const prev = graphNodes[idx - 1]
            return (
              <GraphLine
                key={`line-${idx}`}
                fromNode={prev}
                toNode={node}
                index={idx}
                lineState={getLineState(prev, node)}
                W={canvasSize.W}
                H={canvasSize.H}
              />
            )
          })}
        </svg>
        )}

        {/* Nodes layer */}
        <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 2 }}>
          {graphNodes.map((node, idx) => (
            <GraphNode
              key={node.id}
              node={node}
              index={idx}
              isActive={selectedNode?.id === node.id}
              onClick={() => setSelectedNode(prev => prev?.id === node.id ? null : node)}
            />
          ))}
          {/* Labels rendered separately so they don't interfere with click area */}
          {graphNodes.map((node, idx) => (
            <NodeLabel key={`label-${node.id}`} node={node} index={idx} />
          ))}
        </div>

        {/* Empty state */}
        {showGraph && graphNodes.length === 0 && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Space Grotesk',system-ui", fontSize: 14 }}>No topics found for this roadmap.</p>
          </div>
        )}
      </div>

      {/* ── Detail panel ── */}
      <DetailPanel
        node={enrichedSelectedNode}
        cid={cid}
        settings={settings}
        onClose={() => setSelectedNode(null)}
        onProgressUpdate={handleProgressUpdate}
      />

      {/* Global CSS fixes */}
      <style>{`
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes node-pulse {
          0%,100% { box-shadow: 0 0 25px rgba(99,102,241,0.4),0 0 50px rgba(99,102,241,0.15); }
          50%     { box-shadow: 0 0 40px rgba(99,102,241,0.65),0 0 80px rgba(99,102,241,0.25); }
        }
        @keyframes ring-pulse-outer {
          0%,100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 0.08; transform: scale(1.18); }
        }
      `}</style>
    </div>
  )
}

export default RoadmapPage

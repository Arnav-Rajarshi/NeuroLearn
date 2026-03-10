// ─── NeuroLearn · Performance Dashboard ──────────────────────────────────────
import { useState, useEffect } from 'react'
import { RefreshCw, AlertCircle } from 'lucide-react'

import StreakCard from './components/StreakCard'
import ProgressOverview from './components/ProgressOverview'
import GoalPrediction from './components/GoalPrediction'
import ProgressTrendGraph from './components/ProgressTrendGraph'
import CompactVelocityChart from './components/CompactVelocityChart'

import { fetchDashboardData } from './services/api'

// Grid layout for two-column sections
const GRID_TWO_COL = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
  gap: '1.5rem',
  alignItems: 'start',
}

// Default fallback data when API is unavailable
const DEFAULT_DATA = {
  courses: [
    { name: "Maths", completedTopics: 4, totalTopics: 100 },
    { name: "DSA", completedTopics: 8, totalTopics: 250 },
  ],
  studyStreakDays: 4,
  totalStudyTimeHours: 4.5,
  todaysStudyTimeHours: 1.2,
  goalDeadline: "2026-04-30",
  progressHistory: [
    { week: "Week 1", completed: 1 },
    { week: "Week 2", completed: 3 },
    { week: "Week 3", completed: 2 },
    { week: "Week 4", completed: 4 },
    { week: "Week 5", completed: 6 },
    { week: "Week 6", completed: 8 },
    { week: "Week 7", completed: 7 },
    { week: "Week 8", completed: 10 },
    { week: "Week 9", completed: 11 },
    { week: "Week 10", completed: 8 },
    { week: "Week 11", completed: 12 },
  ],
  velocityData: [],
  metrics: {
    streak: 4,
    weekly_velocity: 4.5,
    completed_topics: 12,
    remaining_topics: 338,
    total_topics: 350,
    goal_prediction: "2026-05-15",
    status: "on_track",
    days_needed: 75,
    days_buffer: 10,
    extra_minutes_per_day: null
  }
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--color-background)', 
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem'
    }}>
      <div 
        className="animate-pulse"
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          border: '3px solid var(--color-primary)',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
        Loading dashboard data...
      </p>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function Dashboard() {
  // State for dashboard data
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUsingFallback, setIsUsingFallback] = useState(false)

  // For demo purposes - in production, get from auth context or URL params
  const uid = import.meta.env.VITE_USER_ID || 'demo-user'
  const cid = import.meta.env.VITE_COURSE_ID || 'demo-course'

  // Fetch dashboard data
  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await fetchDashboardData(uid, cid)
      setData(result)
      setIsUsingFallback(false)
    } catch (err) {
      console.warn('API unavailable, using fallback data:', err.message)
      setData(DEFAULT_DATA)
      setError(err.message)
      setIsUsingFallback(true)
    } finally {
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    loadData()
  }, [uid, cid])

  // Show loading state
  if (loading && !data) {
    return <LoadingSkeleton />
  }

  // Extract data for components
  const {
    courses = DEFAULT_DATA.courses,
    studyStreakDays = DEFAULT_DATA.studyStreakDays,
    totalStudyTimeHours = DEFAULT_DATA.totalStudyTimeHours,
    todaysStudyTimeHours = DEFAULT_DATA.todaysStudyTimeHours,
    goalDeadline = DEFAULT_DATA.goalDeadline,
    progressHistory = DEFAULT_DATA.progressHistory,
  } = data || DEFAULT_DATA

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', padding: '2rem 1rem' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{ 
        maxWidth: '68rem', 
        margin: '0 auto 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.6rem',
              fontWeight: 700,
              color: 'var(--color-foreground)',
              letterSpacing: '-0.02em',
            }}
          >
            Neuro<span style={{ color: 'var(--color-primary)' }}>Learn</span>
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '2px' }}>
            Performance Dashboard
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={loadData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-muted)',
            fontSize: '0.75rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = 'var(--color-primary)'
              e.currentTarget.style.color = 'var(--color-foreground)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)'
            e.currentTarget.style.color = 'var(--color-muted)'
          }}
        >
          <RefreshCw 
            size={14} 
            style={{ 
              animation: loading ? 'spin 1s linear infinite' : 'none' 
            }} 
          />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* ── Fallback Data Notice ───────────────────────────── */}
      {isUsingFallback && (
        <div style={{
          maxWidth: '68rem',
          margin: '0 auto 1rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          background: 'oklch(0.70 0.15 50 / 0.1)',
          border: '1px solid oklch(0.70 0.15 50 / 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--color-warning)'
        }}>
          <AlertCircle size={16} />
          <span>Using demo data. Connect to the backend API for real data.</span>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: '68rem',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Row 1 — Study Streak Banner */}
        <StreakCard streak={studyStreakDays} />

        {/* Row 2 — Course Progress | Goal Prediction */}
        <div style={GRID_TWO_COL}>
          <ProgressOverview courses={courses} />
          <GoalPrediction
            courses={courses}
            totalStudyTimeHours={totalStudyTimeHours}
            goalDeadline={goalDeadline}
          />
        </div>

        {/* Row 3 — Progress Trend Graph (full width) */}
        <ProgressTrendGraph
          courses={courses}
          goalDeadline={goalDeadline}
          totalStudyTimeHours={totalStudyTimeHours}
          progressHistory={progressHistory}
        />

        {/* Row 4 — Compact Learning Velocity (full width, scrollable) */}
        <CompactVelocityChart
          totalStudyTimeHours={totalStudyTimeHours}
          todaysStudyTimeHours={todaysStudyTimeHours}
        />
      </main>

      {/* Spin animation for refresh button */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Dashboard

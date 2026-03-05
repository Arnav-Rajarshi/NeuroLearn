import StreakCard           from './components/StreakCard'
import ProgressOverview    from './components/ProgressOverview'
import GoalPrediction      from './components/GoalPrediction'
import ProgressTrendGraph  from './components/ProgressTrendGraph'
import CompactVelocityChart from './components/CompactVelocityChart'

import {
  courses,
  goalDeadline,
  totalStudyTimeHours,
  todaysStudyTimeHours,
  studyStreakDays,
  totalQuestionsAttempted,
  totalQuestionsCorrect,
} from './data/mockData'

const GRID_TWO_COL = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
  gap: '1.5rem',
  alignItems: 'start',
}

function Dashboard() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)', padding: '2rem 1rem' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={{ maxWidth: '68rem', margin: '0 auto 1.75rem' }}>
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
      </header>

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
        />

        {/* Row 4 — Compact Learning Velocity (full width, scrollable) */}
        <CompactVelocityChart
          totalStudyTimeHours={totalStudyTimeHours}
          todaysStudyTimeHours={todaysStudyTimeHours}
        />
      </main>
    </div>
  )
}

export default Dashboard

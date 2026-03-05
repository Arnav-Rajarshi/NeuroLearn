import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { BookOpen } from 'lucide-react'
import { computeOverallProgress } from '../utils/metrics'

function ProgressOverview({ courses }) {
  const { totalCompleted, totalTopics, percentage } = computeOverallProgress(courses)

  return (
    <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      {/* Heading */}
      <div className="card-heading">
        <BookOpen size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        Course Progress Overview
      </div>

      {/* Circular Ring */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div style={{ width: '10rem', height: '10rem' }}>
          <CircularProgressbar
            value={percentage}
            text={`${percentage.toFixed(1)}%`}
            styles={buildStyles({
              pathColor:            'oklch(0.65 0.2 260)',
              trailColor:           'oklch(0.30 0.02 260)',
              textColor:            'oklch(0.95 0.01 250)',
              textSize:             '13px',
              pathTransitionDuration: 1.2,
              strokeLinecap:        'round',
            })}
          />
        </div>

        <p
          style={{
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: 'var(--color-muted)',
            textAlign: 'center',
          }}
        >
          <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
            {totalCompleted}
          </span>{' '}
          /{' '}
          <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>
            {totalTopics}
          </span>{' '}
          Topics Completed
        </p>
      </div>

      {/* Per-course breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {courses.map((course) => {
          const pct = (course.completedTopics / course.totalTopics) * 100

          return (
            <div key={course.name}>
              {/* Label row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'var(--color-foreground)',
                  }}
                >
                  {course.name}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {course.completedTopics} / {course.totalTopics}
                </span>
              </div>

              {/* Track */}
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                    minWidth: pct > 0 ? '6px' : '0',
                  }}
                />
              </div>

              {/* Percentage hint */}
              <p style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '3px' }}>
                {pct.toFixed(1)}% complete
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProgressOverview

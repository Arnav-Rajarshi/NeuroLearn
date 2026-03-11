import { Target, Calendar, Clock, TrendingUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { computeGoalPrediction } from '../utils/metrics'

/* ── Status config map ──────────────────────────────────── */
const STATUS_CONFIG = {
  on_track: {
    label:    'ON TRACK',
    color:    'var(--color-success)',
    rawColor: 'oklch(0.60 0.2 145)',
    bg:       'oklch(0.60 0.2 145 / 0.12)',
    border:   'oklch(0.60 0.2 145 / 0.35)',
    Icon:     CheckCircle,
    emoji:    '✅',
  },
  close: {
    label:    'CLOSE',
    color:    'var(--color-warning)',
    rawColor: 'oklch(0.70 0.15 50)',
    bg:       'oklch(0.70 0.15 50 / 0.12)',
    border:   'oklch(0.70 0.15 50 / 0.35)',
    Icon:     AlertTriangle,
    emoji:    '⚠️',
  },
  behind: {
    label:    'BEHIND SCHEDULE',
    color:    'var(--color-danger)',
    rawColor: 'oklch(0.637 0.237 25.331)',
    bg:       'oklch(0.637 0.237 25.331 / 0.12)',
    border:   'oklch(0.637 0.237 25.331 / 0.35)',
    Icon:     XCircle,
    emoji:    '🚨',
  },
}

function MetricRow({ icon: Icon, label, value, valueColor }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-surface-raised)',
        borderRadius: '0.75rem',
        padding: '0.65rem 0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={15} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: '0.82rem',
          fontWeight: 600,
          color: valueColor || 'var(--color-foreground)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────── */
function GoalPrediction({ courses, totalStudyTimeHours, goalDeadline }) {
  const prediction = computeGoalPrediction(
    courses,
    totalStudyTimeHours,
    goalDeadline,
  )

  const conf = STATUS_CONFIG[prediction.status]
  const { Icon } = conf

  const fmt = (d) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="dashboard-card animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
      {/* Heading */}
      <div className="card-heading">
        <Target size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        Goal Prediction Meter
      </div>

      {/* Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.25rem',
            borderRadius: '999px',
            background: conf.bg,
            border: `1px solid ${conf.border}`,
          }}
        >
          <Icon size={15} style={{ color: conf.color }} />
          <span
            style={{
              color: conf.color,
              fontWeight: 700,
              fontSize: '0.82rem',
              letterSpacing: '0.06em',
            }}
          >
            {conf.label}
          </span>
        </div>
      </div>

      {/* Date metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        <MetricRow
          icon={Calendar}
          label="Predicted Completion"
          value={fmt(prediction.predictedDate)}
          valueColor={conf.color}
        />
        <MetricRow
          icon={Target}
          label="Target Deadline"
          value={fmt(prediction.deadline)}
        />
        <MetricRow
          icon={TrendingUp}
          label="Days at current pace"
          value={`${prediction.daysNeeded} days`}
        />
      </div>

      {/* Recommendation if behind */}
      {prediction.status === 'behind' && prediction.extraMinutesPerDay !== null && (
        <div
          style={{
            background: 'oklch(0.637 0.237 25.331 / 0.1)',
            border: '1px solid oklch(0.637 0.237 25.331 / 0.3)',
            borderRadius: '0.75rem',
            padding: '0.85rem 1rem',
            marginTop: '0.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.35rem',
            }}
          >
            <Clock size={14} style={{ color: 'var(--color-danger)' }} />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-danger)',
                letterSpacing: '0.04em',
              }}
            >
              RECOMMENDATION
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
            You need{' '}
            <strong style={{ color: 'var(--color-foreground)' }}>
              +{prediction.extraMinutesPerDay} minutes
            </strong>{' '}
            per day to reach your goal on time.
          </p>
        </div>
      )}

      {/* Motivational footer for on-track */}
      {prediction.status === 'on_track' && (
        <div
          style={{
            background: 'oklch(0.60 0.2 145 / 0.1)',
            border: '1px solid oklch(0.60 0.2 145 / 0.3)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            marginTop: '0.5rem',
            fontSize: '0.82rem',
            color: 'var(--color-muted)',
          }}
        >
          🎉 Great pace! You're ahead of schedule. Keep it up!
        </div>
      )}

      {prediction.status === 'close' && (
        <div
          style={{
            background: 'oklch(0.70 0.15 50 / 0.1)',
            border: '1px solid oklch(0.70 0.15 50 / 0.3)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            marginTop: '0.5rem',
            fontSize: '0.82rem',
            color: 'var(--color-muted)',
          }}
        >
          ⚡ You're close! A little extra effort each day will push you over the line.
        </div>
      )}
    </div>
  )
}

export default GoalPrediction

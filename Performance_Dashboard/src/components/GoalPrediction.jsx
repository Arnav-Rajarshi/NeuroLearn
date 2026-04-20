import { Target, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { getGoalPrediction, formatDate } from '../utils/metrics'

/**
 * GoalPrediction - Goal prediction meter with status and recommendations
 * @param {Object} props
 * @param {Array} props.courses - Course data
 * @param {number} props.totalStudyTimeHours - Total study hours
 * @param {Array} props.studyHistory - Study history
 * @param {string} props.goalDeadline - Deadline date (YYYY-MM-DD)
 */
export default function GoalPrediction({ 
  courses = [], 
  totalStudyTimeHours = 0, 
  studyHistory = [], 
  goalDeadline 
}) {
  const prediction = getGoalPrediction({
    courses,
    totalStudyTimeHours,
    studyHistory,
    goalDeadline,
  })

  // Status colors and icons
  const statusConfig = {
    on_track: {
      color: 'var(--color-success)',
      bgColor: 'oklch(0.60 0.2 145 / 0.15)',
      icon: CheckCircle,
      gradient: 'from-emerald-500/20 to-green-500/20',
    },
    close: {
      color: 'var(--color-warning)',
      bgColor: 'oklch(0.70 0.15 50 / 0.15)',
      icon: Clock,
      gradient: 'from-amber-500/20 to-orange-500/20',
    },
    behind: {
      color: 'var(--color-danger)',
      bgColor: 'oklch(0.637 0.237 25.331 / 0.15)',
      icon: AlertTriangle,
      gradient: 'from-red-500/20 to-rose-500/20',
    },
    unknown: {
      color: 'var(--color-muted)',
      bgColor: 'oklch(0.30 0.02 260)',
      icon: Target,
      gradient: 'from-slate-500/20 to-gray-500/20',
    },
  }

  const config = statusConfig[prediction.status] || statusConfig.unknown
  const StatusIcon = config.icon

  // Calculate progress towards goal (visual meter)
  const progressToGoal = prediction.daysUntilDeadline > 0 
    ? Math.min(100, Math.max(0, ((prediction.daysUntilDeadline - (prediction.daysNeeded || 0)) / prediction.daysUntilDeadline) * 100 + 50))
    : 0

  return (
    <div className="dashboard-card h-full flex flex-col">
      <h2 className="card-heading">
        <Target className="w-5 h-5 text-[var(--color-warning)]" />
        Goal Prediction
      </h2>

      {/* Status indicator */}
      <div 
        className={`p-4 rounded-xl bg-gradient-to-br ${config.gradient} mb-4`}
        style={{ borderLeft: `3px solid ${config.color}` }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: config.bgColor }}
          >
            <StatusIcon 
              className="w-5 h-5" 
              style={{ color: config.color }}
            />
          </div>
          <div>
            <p 
              className="text-lg font-semibold"
              style={{ color: config.color }}
            >
              {prediction.statusLabel}
            </p>
            {prediction.daysUntilDeadline !== null && (
              <p className="text-sm text-[var(--color-muted)]">
                {prediction.daysUntilDeadline} days until deadline
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Visual meter */}
      <div className="mb-4">
        <div className="h-2 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${progressToGoal}%`,
              background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
            }}
          />
        </div>
      </div>

      {/* Date info */}
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-raised)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-muted)]" />
            <span className="text-sm text-[var(--color-muted)]">Deadline</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {formatDate(prediction.deadlineDate)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-raised)]">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--color-muted)]" />
            <span className="text-sm text-[var(--color-muted)]">Predicted</span>
          </div>
          <span 
            className="text-sm font-medium"
            style={{ color: config.color }}
          >
            {prediction.predictedDate ? formatDate(prediction.predictedDate) : 'N/A'}
          </span>
        </div>

        {prediction.hoursNeeded && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-raised)]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--color-muted)]" />
              <span className="text-sm text-[var(--color-muted)]">Hours Needed</span>
            </div>
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {prediction.hoursNeeded}h
            </span>
          </div>
        )}
      </div>

      {/* Recommendation for behind/close status */}
      {prediction.extraMinutesNeeded > 0 && (
        <div className="mt-4 p-3 rounded-lg border border-dashed" style={{ borderColor: config.color }}>
          <p className="text-sm text-[var(--color-muted)]">
            <span className="font-medium" style={{ color: config.color }}>
              Recommendation:
            </span>{' '}
            Add <span className="font-semibold text-[var(--color-foreground)]">
              +{prediction.extraMinutesNeeded} minutes
            </span> per day to reach your goal on time.
          </p>
        </div>
      )}
    </div>
  )
}

import { Flame, Zap } from 'lucide-react'
import { getStreakMessage } from '../utils/metrics'

/**
 * StudyStreak - Displays the user's current study streak with motivation
 * @param {Object} props
 * @param {number} props.currentStreak - Current streak in days
 * @param {number} props.longestStreak - Longest streak achieved
 */
export default function StudyStreak({ currentStreak = 0, longestStreak = 0 }) {
  const message = getStreakMessage(currentStreak)
  const isOnFire = currentStreak >= 7

  return (
    <div className="dashboard-card relative overflow-hidden glow-streak">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, oklch(0.7 0.25 30) 0%, transparent 70%)',
        }}
      />
      
      <div className="relative z-10 flex items-center justify-between">
        {/* Streak info */}
        <div className="flex items-center gap-4">
          {/* Fire icon with animation */}
          <div className="relative">
            <div 
              className={`p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 
                ${isOnFire ? 'animate-pulse' : ''}`}
            >
              <Flame 
                className="w-8 h-8 text-orange-400" 
                strokeWidth={2.5}
              />
            </div>
            {isOnFire && (
              <Zap className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-bounce" />
            )}
          </div>

          {/* Streak text */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[var(--color-foreground)]">
                {currentStreak}
              </span>
              <span className="text-lg text-[var(--color-muted)]">
                Day{currentStreak !== 1 ? 's' : ''} Streak
              </span>
            </div>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              {message}
            </p>
          </div>
        </div>

        {/* Best streak badge */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Best
          </span>
          <span className="text-xl font-semibold text-[var(--color-accent)]">
            {longestStreak} days
          </span>
        </div>
      </div>
    </div>
  )
}

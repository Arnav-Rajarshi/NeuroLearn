import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { BookOpen, CheckCircle2 } from 'lucide-react'
import { getOverallProgress } from '../utils/metrics'

/**
 * ProgressOverview - Main progress visualization with circular ring and course breakdown
 * @param {Object} props
 * @param {Array} props.courses - Array of course objects
 */
export default function ProgressOverview({ courses = [] }) {
  const { completed, total, percentage } = getOverallProgress(courses)

  return (
    <div className="dashboard-card h-full flex flex-col">
      <h2 className="card-heading">
        <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
        Course Progress
      </h2>

      {/* Main circular progress */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-40 h-40 relative">
          <CircularProgressbar
            value={percentage}
            text={`${percentage}%`}
            styles={buildStyles({
              rotation: 0,
              strokeLinecap: 'round',
              textSize: '1.5rem',
              pathTransitionDuration: 1,
              pathColor: 'oklch(0.65 0.2 260)',
              textColor: 'oklch(0.95 0.01 250)',
              trailColor: 'oklch(0.24 0.025 260)',
            })}
          />
          {/* Inner glow effect */}
          <div 
            className="absolute inset-4 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, oklch(0.65 0.2 260 / 0.1) 0%, transparent 70%)',
            }}
          />
        </div>
        
        {/* Topics completed summary */}
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {completed} / {total}
          </p>
          <p className="text-sm text-[var(--color-muted)]">
            Topics Completed
          </p>
        </div>
      </div>

      {/* Course breakdown list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {courses.map((course) => {
          const courseProgress = course.totalTopics > 0
            ? Math.round((course.completedTopics / course.totalTopics) * 100)
            : 0

          return (
            <div 
              key={course.id}
              className="group p-3 rounded-xl bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-colors duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <span className="text-sm font-medium text-[var(--color-foreground)] truncate max-w-[140px]">
                    {course.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{course.completedTopics} / {course.totalTopics}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="progress-bar-track">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${courseProgress}%`,
                    background: `linear-gradient(90deg, ${course.color}, ${course.color}88)`,
                    animationDelay: `${courses.indexOf(course) * 0.1}s`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

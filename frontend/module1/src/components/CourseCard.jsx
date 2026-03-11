import { BookOpen, Code, Globe, Database, Layout, Brain, Server, Cloud } from 'lucide-react'
import ProgressBar from './ProgressBar.jsx'
import PremiumLock from './PremiumLock.jsx'

const courseIcons = {
  dsa: Code,
  python: Code,
  english: Globe,
  sql: Database,
  frontend: Layout,
  machinelearning: Brain,
  systemdesign: Server,
  devops: Cloud,
}

function CourseCard({ course, progress, isLocked, onClick, onUpgrade }) {
  const IconComponent = courseIcons[course.id] || BookOpen
  const completedTopics = progress?.completedTopics || 0
  const totalTopics = progress?.totalTopics || 0
  const progressPercent = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0

  return (
    <div
      className="dashboard-card relative cursor-pointer group"
      onClick={() => !isLocked && onClick?.(course)}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isLocked) onClick?.(course)
      }}
      aria-disabled={isLocked}
    >
      {isLocked && <PremiumLock onUpgrade={onUpgrade} />}
      
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-raised)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/20 transition-colors">
          <IconComponent className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        {!isLocked && totalTopics > 0 && (
          <span className="stat-chip text-xs">
            <span className="text-[var(--color-accent)] font-semibold">{completedTopics}</span>
            <span className="text-[var(--color-muted)]">/</span>
            <span className="text-[var(--color-muted)]">{totalTopics}</span>
          </span>
        )}
      </div>

      <h3 className="font-heading font-semibold text-[var(--color-foreground)] mb-1">
        {course.name}
      </h3>
      <p className="text-sm text-[var(--color-muted)] mb-4 line-clamp-2">
        {course.description}
      </p>

      {!isLocked && (
        <ProgressBar progress={progressPercent} />
      )}
    </div>
  )
}

export default CourseCard

import { BookOpen, Code, Globe, Database, Layout, Brain, Server, Cloud, Cpu, Shield, Boxes, Rocket, GitBranch, Network, Terminal } from 'lucide-react'
import ProgressBar from './ProgressBar.jsx'
import PremiumLock from './PremiumLock.jsx'

// Map course names to icons (backend provides course_name)
const courseNameToIcon = {
  'Data Structures & Algorithms': Code,
  'Python Programming': Code,
  'English Proficiency': Globe,
  'RDBMS & SQL': Database,
  'HTML CSS JavaScript': Layout,
  'Machine Learning': Brain,
  'Deep Learning': Brain,
  'AI Fundamentals': Cpu,
  'System Design': Server,
  'Backend Engineering': Terminal,
  'Cloud Computing': Cloud,
  'DevOps Engineering': Rocket,
  'Cybersecurity Basics': Shield,
  'Data Engineering': Database,
  'Distributed Systems': Network,
  'React Advanced': Layout,
  'Node.js Advanced': Terminal,
  'Blockchain Basics': Boxes,
  'Competitive Programming': Code,
  'Software Architecture': GitBranch,
}

function getIconForCourse(courseName) {
  return courseNameToIcon[courseName] || BookOpen
}

function CourseCard({ course, progress, isLocked, onClick, onUpgrade }) {
  const IconComponent = getIconForCourse(course.name)
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

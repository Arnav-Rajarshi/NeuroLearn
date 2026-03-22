import StudyStreak from './components/StudyStreak'
import ProgressOverview from './components/ProgressOverview'
import GoalPrediction from './components/GoalPrediction'
import VelocityChart from './components/VelocityChart'
import { mockData } from './data/mockData'

/**
 * Dashboard - Main dashboard layout composing all dashboard components
 * Uses mock data for now, ready to integrate with backend later
 */
export default function Dashboard() {
  const {
    courses,
    studyHistory,
    totalStudyTimeHours,
    todaysStudyTimeHours,
    goalDeadline,
    streak,
  } = mockData

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)] mb-1">
            Performance Dashboard
          </h1>
          <p className="text-[var(--color-muted)]">
            Track your learning progress and stay on target
          </p>
        </header>

        {/* Study Streak - Full width top card */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <StudyStreak 
            currentStreak={streak.currentStreak} 
            longestStreak={streak.longestStreak} 
          />
        </div>

        {/* Main grid: Progress + Goal Prediction */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <ProgressOverview courses={courses} />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <GoalPrediction 
              courses={courses}
              totalStudyTimeHours={totalStudyTimeHours}
              studyHistory={studyHistory}
              goalDeadline={goalDeadline}
            />
          </div>
        </div>

        {/* Learning Velocity - Full width */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <VelocityChart 
            studyHistory={studyHistory}
            todaysHours={todaysStudyTimeHours}
          />
        </div>
      </div>
    </div>
  )
}

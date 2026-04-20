import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import StudyStreak from '../../Performance_Dashboard/src/components/StudyStreak'
import ProgressOverview from '../../Performance_Dashboard/src/components/ProgressOverview'
import GoalPrediction from '../../Performance_Dashboard/src/components/GoalPrediction'
import VelocityChart from '../../Performance_Dashboard/src/components/VelocityChart'
import { mockData } from '../../Performance_Dashboard/src/data/mockData'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getAllCourses } from '../utils/loadCourseData.js'
import { useTransition } from '../transition/TransitionContext.jsx'
import { getRoadmapProgress, getCoursePreferences } from '../utils/api.js'

/**
 * PerformanceDashboard - Page wrapper for the Performance Dashboard module
 * Integrates into the main NeuroLearn routing structure
 */
export default function PerformanceDashboard() {
  const navigate = useNavigate()
  const { signalDataReady } = useTransition()
  const [realData, setRealData] = useState(null)
  const [dataLoading, setDataLoading] = useState(true)
  
  useEffect(() => {
    async function fetchRealData() {
      try {
        const allCourses = await getAllCourses()
        const courseStats = await Promise.all(
          allCourses.map(async (course) => {
            try {
              const prefs = await getCoursePreferences(course.cid)
              const lm = prefs?.lm || 'PNL'
              const prog = await getRoadmapProgress(course.cid, lm)
              return {
                name: course.name,
                completedTopics: prog?.completed_topics || 0,
                totalTopics: prog?.total_topics || 0,
                completionPercentage: prog?.completion_percentage || 0,
              }
            } catch {
              return { name: course.name, completedTopics: 0, totalTopics: 0, completionPercentage: 0 }
            }
          })
        )
        const activeCourses = courseStats.filter(c => c.completedTopics > 0)
        setRealData({ courses: activeCourses.length > 0 ? activeCourses : courseStats.slice(0, 5) })
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setDataLoading(false)
        signalDataReady()
      }
    }
    fetchRealData()
  }, [])
  
  const {
    studyHistory,
    totalStudyTimeHours,
    todaysStudyTimeHours,
    goalDeadline,
    streak,
  } = mockData
  const courses = realData?.courses || []

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6 lg:p-8"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with navigation */}
        <header className="animate-fade-in-up">
          <button
            onClick={() => navigate('/roadmap-engine/courses')}
            className="flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Courses</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-primary)]/20">
              <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
                Performance Dashboard
              </h1>
              <p className="text-[var(--color-muted)]">
                Track your learning progress and stay on target
              </p>
            </div>
          </div>
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
    </motion.div>
  )
} 


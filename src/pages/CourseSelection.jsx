import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, Sparkles, Crown, Wand2, Lock } from 'lucide-react'
import CourseCard from '../components/CourseCard.jsx'
import { getAllCourses, loadCourseData, getTotalSubtopics } from '../utils/loadCourseData.js'
import { 
  isPremiumUser, 
  getCourseProgress, 
  getTotalCompletedSubtopics,
  setPremiumStatus,
  getCourseSettings 
} from '../utils/progressStore.js'

function CourseSelection() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [courseData, setCourseData] = useState({})
  const [premium, setPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [learningGoal, setLearningGoal] = useState('')
  const [showGoalMessage, setShowGoalMessage] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const allCourses = getAllCourses()
      setCourses(allCourses)
      setPremium(isPremiumUser())

      // Load course data for each free course to get total topics
      const dataMap = {}
      for (const course of allCourses) {
        if (course.free && course.pnlFile) {
          try {
            const data = await loadCourseData(course.id, 'pnl')
            dataMap[course.id] = data
          } catch (error) {
            console.error(`Failed to load data for ${course.id}`, error)
          }
        }
      }
      setCourseData(dataMap)
      setLoading(false)
    }
    loadData()
  }, [])

  const handleCourseClick = (course) => {
    // Check if course has existing settings/roadmap
    const settings = getCourseSettings(course.id)
    if (settings?.roadmapType) {
      // Go directly to roadmap if already set up
      navigate(`/roadmap/${course.id}`)
    } else {
      // Go to setup modal
      navigate(`/setup/${course.id}`)
    }
  }

  const handleUpgrade = () => {
    // Toggle premium for demo purposes
    const newPremiumStatus = !premium
    setPremiumStatus(newPremiumStatus)
    setPremium(newPremiumStatus)
  }

  const getProgressForCourse = (courseId) => {
    const data = courseData[courseId]
    if (!data) return { completedTopics: 0, totalTopics: 0 }
    
    const totalTopics = getTotalSubtopics(data)
    const completedTopics = getTotalCompletedSubtopics(courseId)
    
    return { completedTopics, totalTopics }
  }

  const handleGenerateRoadmap = () => {
    setShowGoalMessage(true)
    setTimeout(() => setShowGoalMessage(false), 3000)
  }

  const freeCourses = courses.filter(c => c.free)
  const premiumCourses = courses.filter(c => !c.free)

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-bold text-[var(--color-foreground)]">
                  NeuroLearn
                </h1>
                <p className="text-xs text-[var(--color-muted)]">Roadmap Engine</p>
              </div>
            </div>

            <button
              onClick={handleUpgrade}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                premium
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-foreground)] hover:bg-[var(--color-border)]'
              }`}
            >
              <Crown className="w-4 h-4" />
              {premium ? 'Premium Active' : 'Upgrade to Premium'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
            <span className="text-sm font-medium text-[var(--color-accent)]">Your Learning Journey</span>
          </div>
          <h2 className="font-heading text-3xl font-bold text-[var(--color-foreground)] mb-2">
            Choose Your Course
          </h2>
          <p className="text-[var(--color-muted)] max-w-2xl">
            Select a course to begin your personalized learning roadmap. Track your progress and master new skills at your own pace.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-raised)] mb-4" />
                <div className="h-5 bg-[var(--color-surface-raised)] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[var(--color-surface-raised)] rounded w-full mb-4" />
                <div className="h-1.5 bg-[var(--color-surface-raised)] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Free Courses */}
            <section className="mb-10">
              <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                Free Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeCourses.map((course, index) => (
                  <div 
                    key={course.id} 
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CourseCard
                      course={course}
                      progress={getProgressForCourse(course.id)}
                      isLocked={false}
                      onClick={handleCourseClick}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Premium Courses */}
            <section className="mb-10">
              <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)] mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4 text-[var(--color-warning)]" />
                Premium Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumCourses.map((course, index) => (
                  <div 
                    key={course.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${(freeCourses.length + index) * 0.1}s` }}
                  >
                    <CourseCard
                      course={course}
                      progress={{ completedTopics: 0, totalTopics: 0 }}
                      isLocked={!premium}
                      onClick={handleCourseClick}
                      onUpgrade={handleUpgrade}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* AI Goal Input Textplate */}
            <section className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <div className={`dashboard-card relative overflow-hidden ${!premium ? 'opacity-80' : ''}`}>
                {/* Premium Lock Overlay */}
                {!premium && (
                  <div className="absolute inset-0 bg-[var(--color-background)]/60 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-8 h-8 text-[var(--color-warning)] mx-auto mb-2" />
                      <p className="text-sm font-medium text-[var(--color-foreground)]">Premium Feature</p>
                      <button
                        onClick={handleUpgrade}
                        className="mt-2 px-4 py-1.5 text-xs font-medium bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Upgrade to Unlock
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-primary)] flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)]">
                      Describe Your Learning Goal
                    </h3>
                    <p className="text-xs text-[var(--color-muted)]">AI-powered personalized roadmap generation</p>
                  </div>
                </div>

                <textarea
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="Type your learning goal here... (e.g., 'I want to become a backend developer in 6 months')"
                  className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all"
                  disabled={!premium}
                />

                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-[var(--color-muted)]">
                    Our AI will create a personalized roadmap based on your goals
                  </p>
                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={!premium || !learningGoal.trim()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      premium && learningGoal.trim()
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:opacity-90'
                        : 'bg-[var(--color-surface-raised)] text-[var(--color-muted)] cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Roadmap
                  </button>
                </div>

                {/* Coming Soon Message */}
                {showGoalMessage && (
                  <div className="mt-4 p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 animate-fade-in-up">
                    <p className="text-sm text-[var(--color-primary)] text-center font-medium">
                      AI roadmap generation coming soon.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default CourseSelection

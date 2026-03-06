import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  Settings, 
  Target, 
  Clock, 
  TrendingUp,
  BookOpen,
  Code,
  Calendar,
  Award
} from 'lucide-react'
import TopicAccordion from '../components/TopicAccordion.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { getCourseById, loadCourseData, getTotalSubtopics } from '../utils/loadCourseData.js'
import { 
  getCourseSettings, 
  getProgress,
  getTotalCompletedSubtopics,
  getGoalDeadline,
  getTotalXP
} from '../utils/progressStore.js'

function RoadmapPage() {
  const { course: courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get known topics from navigation state
  const knownTopics = location.state?.knownTopics || []
  
  const [course, setCourse] = useState(null)
  const [courseData, setCourseData] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(null)
  const [totalXP, setTotalXP] = useState(0)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      const courseInfo = getCourseById(courseId)
      if (!courseInfo) {
        navigate('/roadmap-engine/courses')
        return
      }
      setCourse(courseInfo)

      const courseSettings = getCourseSettings(courseId)
      if (!courseSettings) {
        // Redirect to setup if no settings
        navigate(`/roadmap-engine/setup/${courseId}`)
        return
      }
      setSettings(courseSettings)

      try {
        const data = await loadCourseData(courseId, courseSettings.roadmapType)
        setCourseData(data)
        setProgress(getProgress())
        setTotalXP(getTotalXP())
      } catch (error) {
        console.error('Failed to load course data', error)
      }
      setLoading(false)
    }
    loadData()
  }, [courseId, navigate])

  const getCompletedSubtopicsForTopic = (topicName) => {
    if (!progress?.completedSubtopics?.[courseId]?.[topicName]) return []
    return progress.completedSubtopics[courseId][topicName]
  }

  const handleTopicComplete = (topicName, xpEarned) => {
    setTotalXP(getTotalXP())
    setProgress(getProgress())
  }

  // Filter out known topics from the roadmap
  const filteredTopics = courseData?.topics?.filter(
    topic => !knownTopics.includes(topic.name)
  ) || []

  // Calculate total subtopics from filtered topics only
  const totalSubtopics = filteredTopics.reduce((total, topic) => {
    return total + (topic.subtopics ? topic.subtopics.length : 0)
  }, 0)
  const completedSubtopics = getTotalCompletedSubtopics(courseId)
  const overallProgress = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0

  const goalDeadline = getGoalDeadline()
  const daysRemaining = goalDeadline 
    ? Math.max(0, Math.ceil((new Date(goalDeadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-muted)]">Loading roadmap...</div>
      </div>
    )
  }

  if (!course || !courseData) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/roadmap-engine/courses')}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Back to courses"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--color-muted)]" />
              </button>
              <div>
                <h1 className="font-heading text-lg font-bold text-[var(--color-foreground)]">
                  {courseData.courseName || course.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {settings?.roadmapType === 'practice' ? (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-accent)]">
                      <Code className="w-3 h-3" />
                      Practice Only
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[var(--color-primary)]">
                      <BookOpen className="w-3 h-3" />
                      Learning + Practice
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* XP Display */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-warning)]/10">
                <Award className="w-4 h-4 text-[var(--color-warning)]" />
                <span className="text-sm font-semibold text-[var(--color-warning)]">{totalXP} XP</span>
              </div>
              
              <button
                onClick={() => navigate(`/roadmap-engine/setup/${courseId}`)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 text-[var(--color-muted)]" />
                <span className="text-sm text-[var(--color-muted)] hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Overview */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overall Progress */}
            <div className="dashboard-card !p-4 col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-foreground)]">Overall Progress</span>
                </div>
                <span className="text-2xl font-bold text-[var(--color-primary)]">
                  {Math.round(overallProgress)}%
                </span>
              </div>
              <ProgressBar progress={overallProgress} size="large" />
              <p className="text-xs text-[var(--color-muted)] mt-2">
                {completedSubtopics} of {totalSubtopics} subtopics completed
              </p>
            </div>

            {/* Topics Count */}
            <div className="dashboard-card !p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-muted)]">Topics</span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-foreground)]">
                {filteredTopics.length}
              </p>
            </div>

            {/* Time/Deadline */}
            <div className="dashboard-card !p-4">
              <div className="flex items-center gap-2 mb-2">
                {daysRemaining !== null ? (
                  <Calendar className="w-4 h-4 text-[var(--color-warning)]" />
                ) : (
                  <Clock className="w-4 h-4 text-[var(--color-muted)]" />
                )}
                <span className="text-sm text-[var(--color-muted)]">
                  {daysRemaining !== null ? 'Days Left' : 'Est. Hours'}
                </span>
              </div>
              <p className="text-2xl font-bold text-[var(--color-foreground)]">
                {daysRemaining !== null ? daysRemaining : (courseData.estimatedHours || '--')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Roadmap */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h2 className="font-heading text-xl font-semibold text-[var(--color-foreground)]">
            Your Learning Path
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Click on a topic to expand and view subtopics
          </p>
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {filteredTopics.map((topic, index) => {
            const completedInTopic = getCompletedSubtopicsForTopic(topic.name)

            return (
              <div 
                key={index}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <TopicAccordion
                  topic={topic}
                  courseId={courseId}
                  completedSubtopics={completedInTopic}
                  roadmapType={settings?.roadmapType}
                  onTopicComplete={handleTopicComplete}
                />
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-[var(--color-muted)]" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)] mb-2">
              No topics available
            </h3>
            <p className="text-[var(--color-muted)]">
              This course does not have any topics yet.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

export default RoadmapPage

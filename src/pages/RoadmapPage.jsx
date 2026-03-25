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
import { getCourseById } from '../utils/loadCourseData.js'
import { getRoadmap, getRoadmapProgress, getCoursePreferences } from '../utils/api.js'

function RoadmapPage() {
  const { course: courseIdParam } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Parse cid from URL - must be a number
  const cid = parseInt(courseIdParam, 10)
  
  // Get known topics from navigation state
  const knownTopics = location.state?.knownTopics || []
  
  const [course, setCourse] = useState(null)
  const [roadmapData, setRoadmapData] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({})
  const [topicsToBeShown, setTopicsToBeShown] = useState([])
  const [totalXP, setTotalXP] = useState(0)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    async function loadData() {
      // Validate cid
      if (!cid || isNaN(cid)) {
        console.error('[v0] Invalid course cid:', courseIdParam)
        navigate('/roadmap-engine/courses')
        return
      }
      
      setLoading(true)
      setLoadError(null)
      
      try {
        const courseInfo = await getCourseById(cid)
        
        if (!courseInfo) {
          console.error('[v0] Course not found for cid:', cid)
          navigate('/roadmap-engine/courses')
          return
        }
        setCourse(courseInfo)

        // Load preferences from backend API using cid
        const prefs = await getCoursePreferences(cid)
        
        if (!prefs || !prefs.lm) {
          // Redirect to setup if no settings
          navigate(`/roadmap-engine/setup/${cid}`)
          return
        }
        
        const roadmapType = prefs.lm
        setSettings({
          roadmapType,
          goalDeadline: prefs.goal_date,
          weeklyHours: prefs.hrs_per_week
        })

        // Load full roadmap with progress from backend using cid
        const roadmap = await getRoadmap(cid, roadmapType)
        
        if (!roadmap || !roadmap.topics) {
          throw new Error('Invalid roadmap data received')
        }
        
        setRoadmapData({
          courseName: roadmap.course_name,
          estimatedHours: roadmap.estimated_hours,
          topics: roadmap.topics,
          totalTopics: roadmap.total_topics,
          completedTopics: roadmap.completed_topics,
          completionPercentage: roadmap.completion_percentage
        })
        
        setProgress(roadmap.progress || {})
        setTopicsToBeShown(roadmap.topics_to_be_shown || [])
        
        // Calculate XP from completed subtopics (10 XP per subtopic)
        setTotalXP(roadmap.completed_topics * 10)
      } catch (error) {
        console.error('[v0] Failed to load roadmap data:', error)
        setLoadError(error.message || 'Failed to load roadmap. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [cid, courseIdParam, navigate])

  // Check if a subtopic is completed using the topic_key format
  const isSubtopicCompleted = (topicName, subtopicName) => {
    const key = `${topicName}::${subtopicName}`
    return progress[key] === true
  }

  const getCompletedSubtopicsForTopic = (topicName) => {
    // Return array of subtopic names that are completed for this topic
    const completed = []
    for (const [key, value] of Object.entries(progress)) {
      if (value === true && key.startsWith(`${topicName}::`)) {
        // Extract subtopic name from key
        const subtopicName = key.split('::')[1]
        if (subtopicName) {
          completed.push(subtopicName)
        }
      }
    }
    return completed
  }

  const handleTopicComplete = async () => {
    // Refresh progress from backend using cid
    if (!cid) return
    
    try {
      const roadmapType = settings?.roadmapType || 'PNL'
      const updatedProgress = await getRoadmapProgress(cid, roadmapType)
      
      setProgress(updatedProgress.progress || {})
      setTopicsToBeShown(updatedProgress.topics_to_be_shown || [])
      setTotalXP(updatedProgress.completed_topics * 10)
      
      // Update roadmapData with new completion stats
      setRoadmapData(prev => ({
        ...prev,
        completedTopics: updatedProgress.completed_topics,
        completionPercentage: updatedProgress.completion_percentage
      }))
    } catch (error) {
      console.error('Failed to refresh progress', error)
    }
  }

  // Filter out known topics from the roadmap
  const filteredTopics = roadmapData?.topics?.filter(
    topic => !knownTopics.includes(topic.name)
  ) || []

  // Calculate total subtopics from filtered topics only
  const totalSubtopics = filteredTopics.reduce((total, topic) => {
    return total + (topic.subtopics ? topic.subtopics.length : 0)
  }, 0)
  
  // Count completed subtopics from progress object
  const completedSubtopics = Object.values(progress).filter(v => v === true).length
  const overallProgress = totalSubtopics > 0 ? (completedSubtopics / totalSubtopics) * 100 : 0

  const goalDeadline = settings?.goalDeadline
  const daysRemaining = goalDeadline 
    ? Math.max(0, Math.ceil((new Date(goalDeadline) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-[var(--color-muted)] text-sm">Loading roadmap...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4">
        <div className="dashboard-card max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)] mb-2">
            Failed to Load Roadmap
          </h3>
          <p className="text-[var(--color-muted)] text-sm mb-4">
            {loadError}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/roadmap-engine/courses')}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] transition-colors text-sm"
            >
              Back to Courses
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!course || !roadmapData) {
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
                  {roadmapData.courseName || course.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {settings?.roadmapType === 'PRACTICE' ? (
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
                  {topicsToBeShown.length > 0 && (
                    <span className="text-xs text-[var(--color-muted)]">
                      ({topicsToBeShown.length} remaining)
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
                onClick={() => navigate(`/roadmap-engine/setup/${cid}`)}
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
                {daysRemaining !== null ? daysRemaining : (roadmapData.estimatedHours || '--')}
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
                  cid={cid}
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

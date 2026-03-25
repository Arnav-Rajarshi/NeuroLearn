import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  BookOpen, 
  Code, 
  Calendar, 
  Clock, 
  ChevronDown,
  Check,
  X,
  Rocket
} from 'lucide-react'
import { getCourseById, getTopicNames } from '../utils/loadCourseData.js'
import { saveCoursePreferences, getRoadmap } from '../utils/api.js'

function CourseSetup() {
  const { course: courseIdParam } = useParams()
  const navigate = useNavigate()
  
  // Parse cid from URL - must be a number
  const cid = parseInt(courseIdParam, 10)
  
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [topics, setTopics] = useState([])
  const [topicsError, setTopicsError] = useState(null)
  
  // Form state
  const [roadmapType, setRoadmapType] = useState('PNL')
  const [knownTopics, setKnownTopics] = useState([])
  const [goalDeadline, setGoalDeadline] = useState('')
  const [weeklyHours, setWeeklyHours] = useState(10)
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      // Validate cid
      if (!cid || isNaN(cid)) {
        navigate('/roadmap-engine/courses')
        return
      }
      
      setLoading(true)
      setTopicsLoading(true)
      setTopicsError(null)
      
      try {
        const courseInfo = await getCourseById(cid)
        
        if (!courseInfo) {
          navigate('/roadmap-engine/courses')
          return
        }
        setCourse(courseInfo)
      } catch {
        navigate('/roadmap-engine/courses')
        return
      } finally {
        setLoading(false)
      }

      // Fetch topics from backend API only (no local JSON files)
      try {
        const roadmapData = await getRoadmap(cid, 'PNL')
        
        if (roadmapData?.topics && Array.isArray(roadmapData.topics)) {
          const topicNames = getTopicNames(roadmapData)
          setTopics(topicNames)
        } else {
          setTopicsError('No topics available for this course.')
          setTopics([])
        }
      } catch (error) {
        setTopicsError('Unable to load topics. You can still continue without selecting known topics.')
        setTopics([])
      } finally {
        setTopicsLoading(false)
      }
    }
    loadData()
  }, [cid, courseIdParam, navigate])

  const handleTopicToggle = (topicName) => {
    setKnownTopics(prev => 
      prev.includes(topicName)
        ? prev.filter(t => t !== topicName)
        : [...prev, topicName]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cid) return
    
    setSaving(true)
    
    try {
      // Save preferences to backend API using cid
      await saveCoursePreferences({
        cid: cid,
        lm: roadmapType,
        goal_date: goalDeadline || null,
        hrs_per_week: weeklyHours,
        known_topics: knownTopics
      })

      // Navigate to roadmap with known topics in state
      navigate(`/roadmap-engine/roadmap/${cid}`, {
        state: { knownTopics }
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
      // Still navigate even if save fails - preferences can be saved later
      navigate(`/roadmap-engine/roadmap/${cid}`, {
        state: { knownTopics }
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
          <p className="text-[var(--color-muted)] text-sm">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return null
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate('/roadmap-engine/courses')}
            className="flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Courses</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-fade-in-up">
          {/* Course Header */}
          <div className="mb-8">
            <h1 className="font-heading text-2xl font-bold text-[var(--color-foreground)] mb-2">
              Setup Your Roadmap
            </h1>
            <p className="text-[var(--color-muted)]">
              Configure your learning path for <span className="text-[var(--color-primary)] font-medium">{course.name}</span>
            </p>
          </div>

          {/* Setup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Roadmap Type */}
            <div className="dashboard-card">
              <h3 className="card-heading">
                <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
                Roadmap Type
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRoadmapType('PNL')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    roadmapType === 'PNL'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                    </div>
                    {roadmapType === 'PNL' && (
                      <Check className="w-5 h-5 text-[var(--color-primary)]" />
                    )}
                  </div>
                  <h4 className="font-semibold text-[var(--color-foreground)]">Learning + Practice</h4>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    Complete curriculum with video tutorials and practice problems
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRoadmapType('PRACTICE')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    roadmapType === 'PRACTICE'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/20 flex items-center justify-center">
                      <Code className="w-5 h-5 text-[var(--color-accent)]" />
                    </div>
                    {roadmapType === 'PRACTICE' && (
                      <Check className="w-5 h-5 text-[var(--color-accent)]" />
                    )}
                  </div>
                  <h4 className="font-semibold text-[var(--color-foreground)]">Practice Only</h4>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    Jump straight into problem solving and coding challenges
                  </p>
                </button>
              </div>
            </div>

            {/* Known Topics */}
            <div className="dashboard-card">
              <h3 className="card-heading">
                <Check className="w-4 h-4 text-[var(--color-success)]" />
                Topics You Already Know
              </h3>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                Select topics you are already familiar with (optional)
              </p>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)]/50 transition-colors"
                >
                  <span className="text-sm text-[var(--color-foreground)]">
                    {knownTopics.length === 0 
                      ? 'None selected' 
                      : `${knownTopics.length} topic${knownTopics.length > 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[var(--color-muted)] transition-transform ${isTopicDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTopicDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl max-h-60 overflow-y-auto">
                    {topicsLoading ? (
                      <div className="px-4 py-3 text-sm text-[var(--color-muted)] flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[var(--color-muted)]/30 border-t-[var(--color-muted)] rounded-full animate-spin" />
                        Loading topics...
                      </div>
                    ) : topics.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[var(--color-muted)]">
                        {topicsError || 'No topics available'}
                      </div>
                    ) : (
                      topics.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => handleTopicToggle(topic)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--color-surface-raised)] transition-colors"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            knownTopics.includes(topic)
                              ? 'border-[var(--color-success)] bg-[var(--color-success)]'
                              : 'border-[var(--color-border)]'
                          }`}>
                            {knownTopics.includes(topic) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm text-[var(--color-foreground)]">{topic}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Topics */}
              {knownTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {knownTopics.map((topic) => (
                    <span
                      key={topic}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => handleTopicToggle(topic)}
                        className="hover:bg-[var(--color-success)]/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Goal Deadline */}
            <div className="dashboard-card">
              <h3 className="card-heading">
                <Calendar className="w-4 h-4 text-[var(--color-warning)]" />
                Goal Deadline
              </h3>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                When do you want to complete this course? (optional)
              </p>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Weekly Time Allocation */}
            <div className="dashboard-card">
              <h3 className="card-heading">
                <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                Weekly Time Allocation
              </h3>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                How many hours per week can you dedicate to learning?
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className="flex-1 accent-[var(--color-primary)]"
                />
                <div className="stat-chip min-w-20 justify-center">
                  <span className="text-[var(--color-foreground)] font-semibold">{weeklyHours}</span>
                  <span className="text-[var(--color-muted)] text-sm">hrs/week</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-lg hover:opacity-90 transition-opacity glow-streak disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Rocket className="w-5 h-5" />
              )}
              {saving ? 'Saving...' : 'Start Learning'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default CourseSetup

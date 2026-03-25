import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  BookOpen,
  Youtube,
  FileText,
  ExternalLink,
  Code,
  CheckCircle2,
  Circle,
  ChevronRight
} from 'lucide-react'
import { getCourseById } from '../utils/loadCourseData.js'
import { getRoadmap, getCoursePreferences, updateRoadmapProgress } from '../utils/api.js'

function TopicPage() {
  const { course: courseIdParam, topic: topicSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Parse cid from URL or get from state
  const cid = location.state?.cid || parseInt(courseIdParam, 10)
  
  const [course, setCourse] = useState(null)
  const [topic, setTopic] = useState(null)
  const [subtopic, setSubtopic] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)
  const [progress, setProgress] = useState({})

  // Check if a subtopic is completed from progress state
  const checkSubtopicCompleted = (topicName, subtopicName) => {
    const key = `${topicName}::${subtopicName}`
    return progress[key] === true
  }

  useEffect(() => {
    async function loadData() {
      // Validate cid
      if (!cid || isNaN(cid)) {
        navigate('/roadmap-engine/courses')
        return
      }
      
      setLoading(true)
      
      const courseInfo = await getCourseById(cid)
      if (!courseInfo) {
        navigate('/roadmap-engine/courses')
        return
      }
      setCourse(courseInfo)

      // Try to get data from location state first
      if (location.state?.topic && location.state?.subtopic && location.state?.progress) {
        setTopic(location.state.topic)
        setSubtopic(location.state.subtopic)
        setProgress(location.state.progress || {})
        const key = `${location.state.topic.name}::${location.state.subtopic.name}`
        setCompleted(location.state.progress?.[key] === true)
        setLoading(false)
        return
      }

      // Otherwise load from backend API
      try {
        const prefs = await getCoursePreferences(cid)
        const roadmapType = prefs?.lm || 'PNL'
        
        const roadmap = await getRoadmap(cid, roadmapType)
        setProgress(roadmap.progress || {})
        
        const topicName = decodeURIComponent(topicSlug)
        const foundTopic = roadmap.topics?.find(t => t.name === topicName)
        
        if (foundTopic) {
          setTopic(foundTopic)
          // Default to first subtopic
          if (foundTopic.subtopics?.length > 0) {
            const firstSubtopic = foundTopic.subtopics[0]
            setSubtopic(firstSubtopic)
            const key = `${foundTopic.name}::${firstSubtopic.name}`
            setCompleted(roadmap.progress?.[key] === true)
          }
        }
      } catch (error) {
        console.error('Failed to load topic data', error)
      }
      setLoading(false)
    }
    loadData()
  }, [cid, courseIdParam, topicSlug, navigate, location.state])

  const handleMarkComplete = async () => {
    if (topic && subtopic && cid) {
      try {
        const topicKey = `${topic.name}::${subtopic.name}`
        await updateRoadmapProgress(cid, topicKey, true)
        setCompleted(true)
        setProgress(prev => ({ ...prev, [topicKey]: true }))
      } catch (error) {
        console.error('Failed to mark subtopic as complete:', error)
      }
    }
  }

  const handleSubtopicChange = (newSubtopic) => {
    setSubtopic(newSubtopic)
    setCompleted(checkSubtopicCompleted(topic.name, newSubtopic.name))
  }

  const handlePracticeClick = (question, index) => {
    navigate(`/roadmap-engine/practice/${cid}/${encodeURIComponent(question.title || `question-${index}`)}`, {
      state: { question, topic, subtopic, cid }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-muted)]">Loading...</div>
      </div>
    )
  }

  if (!topic || !subtopic) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-muted)] mb-4">Topic not found</p>
          <button
            onClick={() => navigate(`/roadmap-engine/roadmap/${cid}`)}
            className="text-[var(--color-primary)] hover:underline"
          >
            Back to Roadmap
          </button>
        </div>
      </div>
    )
  }

  const learningResources = subtopic.learningResources || []
  const practiceQuestions = subtopic.practice || subtopic.questions || []

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/roadmap-engine/roadmap/${cid}`)}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
              aria-label="Back to roadmap"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--color-muted)]" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--color-muted)] mb-0.5">{topic.name}</p>
              <h1 className="font-heading text-lg font-bold text-[var(--color-foreground)] truncate">
                {subtopic.name}
              </h1>
            </div>
            
            <button
              onClick={handleMarkComplete}
              disabled={completed}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                completed
                  ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                  : 'bg-[var(--color-primary)] text-white hover:opacity-90'
              }`}
            >
              {completed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </>
              ) : (
                <>
                  <Circle className="w-4 h-4" />
                  Mark Complete
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Subtopics Navigation */}
          <aside className="lg:col-span-1">
            <div className="dashboard-card !p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-3">
                Subtopics
              </h3>
              <nav className="space-y-1">
                {topic.subtopics?.map((st, index) => {
                  const isActive = st.name === subtopic.name
                  const isCompleted = checkSubtopicCompleted(topic.name, st.name)
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSubtopicChange(st)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[var(--color-success)]" />
                      ) : (
                        <Circle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span className="truncate">{st.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            {/* Learning Resources */}
            {learningResources.length > 0 && (
              <section className="dashboard-card">
                <h2 className="card-heading">
                  <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
                  Learning Resources
                </h2>
                <div className="space-y-3">
                  {learningResources.map((resource, index) => {
                    const isYoutube = resource.type === 'youtube' || resource.url?.includes('youtube')
                    
                    return (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)]/50 transition-colors group"
                      >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isYoutube ? 'bg-red-500/10' : 'bg-[var(--color-primary)]/10'
                        }`}>
                          {isYoutube ? (
                            <Youtube className="w-6 h-6 text-red-500" />
                          ) : (
                            <FileText className="w-6 h-6 text-[var(--color-primary)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
                            {resource.title}
                          </p>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 capitalize">
                            {resource.type || 'Article'}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors flex-shrink-0" />
                      </a>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Practice Questions */}
            {practiceQuestions.length > 0 && (
              <section className="dashboard-card">
                <h2 className="card-heading">
                  <Code className="w-4 h-4 text-[var(--color-accent)]" />
                  Practice Questions
                  <span className="ml-auto text-sm font-normal text-[var(--color-muted)]">
                    {practiceQuestions.length} problems
                  </span>
                </h2>
                <div className="space-y-2">
                  {practiceQuestions.map((question, index) => (
                    <div
                      key={index}
                      onClick={() => handlePracticeClick(question, index)}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)]/50 transition-colors cursor-pointer group"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePracticeClick(question, index)
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-[var(--color-accent)]">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-accent)] transition-colors">
                          {question.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {question.platform && (
                            <span className="text-xs text-[var(--color-muted)]">
                              {question.platform}
                            </span>
                          )}
                          {question.difficulty && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              question.difficulty === 'Easy' 
                                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                                : question.difficulty === 'Medium'
                                ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                                : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                            }`}>
                              {question.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {learningResources.length === 0 && practiceQuestions.length === 0 && (
              <div className="dashboard-card text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[var(--color-surface-raised)] flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[var(--color-muted)]" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-[var(--color-foreground)] mb-2">
                  No content available
                </h3>
                <p className="text-[var(--color-muted)]">
                  This subtopic does not have any resources yet.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default TopicPage

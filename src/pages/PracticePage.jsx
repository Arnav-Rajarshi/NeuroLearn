import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  ExternalLink,
  Code,
  CheckCircle2,
  Play,
  RotateCcw,
  Send
} from 'lucide-react'
import { recordQuestionAttempt, isQuestionAttempted } from '../utils/progressStore.js'

function PracticePage() {
  const { course: courseId, question: questionSlug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [question, setQuestion] = useState(null)
  const [topic, setTopic] = useState(null)
  const [subtopic, setSubtopic] = useState(null)
  const [code, setCode] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (location.state?.question) {
      setQuestion(location.state.question)
      setTopic(location.state.topic)
      setSubtopic(location.state.subtopic)
      setAttempted(isQuestionAttempted(courseId, location.state.question.title))
    } else {
      // If no state, redirect back to roadmap
      navigate(`/roadmap-engine/roadmap/${courseId}`)
    }
    }, [location.state, courseId, navigate])

  const handleSubmit = () => {
    if (question) {
      // Record attempt (mark as correct for demo)
      recordQuestionAttempt(courseId, question.title, true)
      setAttempted(true)
      setSubmitted(true)
    }
  }

  const handleReset = () => {
    setCode('')
    setSubmitted(false)
  }

  const handleOpenExternal = () => {
    if (question?.url) {
      window.open(question.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--color-muted)]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--color-muted)]" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-0.5">
                  {topic && <span>{topic.name}</span>}
                  {topic && subtopic && <span>/</span>}
                  {subtopic && <span>{subtopic.name}</span>}
                </div>
                <h1 className="font-heading text-lg font-bold text-[var(--color-foreground)] truncate">
                  {question.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {attempted && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Attempted
                </span>
              )}
              {question.url && (
                <button
                  onClick={handleOpenExternal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in {question.platform || 'External'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Problem Description */}
          <div className="dashboard-card flex flex-col">
            <h2 className="card-heading">
              <Code className="w-4 h-4 text-[var(--color-accent)]" />
              Problem Description
            </h2>
            
            <div className="flex-1 space-y-4">
              {/* Problem Details */}
              <div className="flex flex-wrap gap-2">
                {question.platform && (
                  <span className="stat-chip text-xs">
                    {question.platform}
                  </span>
                )}
                {question.difficulty && (
                  <span className={`stat-chip text-xs ${
                    question.difficulty === 'Easy' 
                      ? 'text-[var(--color-success)]'
                      : question.difficulty === 'Medium'
                      ? 'text-[var(--color-warning)]'
                      : 'text-[var(--color-danger)]'
                  }`}>
                    {question.difficulty}
                  </span>
                )}
              </div>

              {/* Problem Statement */}
              <div className="p-4 rounded-xl bg-[var(--color-surface-raised)]">
                <h3 className="font-semibold text-[var(--color-foreground)] mb-2">Problem</h3>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  {question.description || `Solve the "${question.title}" problem. Click "Open in ${question.platform || 'External'}" to view the full problem statement and submit your solution on the original platform.`}
                </p>
              </div>

              {/* Sample Input/Output (if available) */}
              {(question.sampleInput || question.sampleOutput) && (
                <div className="space-y-3">
                  {question.sampleInput && (
                    <div className="p-4 rounded-xl bg-[var(--color-surface-raised)]">
                      <h3 className="font-semibold text-[var(--color-foreground)] mb-2 text-sm">Sample Input</h3>
                      <pre className="text-sm text-[var(--color-accent)] font-mono bg-[var(--color-background)] p-3 rounded-lg overflow-x-auto">
                        {question.sampleInput}
                      </pre>
                    </div>
                  )}
                  {question.sampleOutput && (
                    <div className="p-4 rounded-xl bg-[var(--color-surface-raised)]">
                      <h3 className="font-semibold text-[var(--color-foreground)] mb-2 text-sm">Expected Output</h3>
                      <pre className="text-sm text-[var(--color-success)] font-mono bg-[var(--color-background)] p-3 rounded-lg overflow-x-auto">
                        {question.sampleOutput}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Hints */}
              <div className="p-4 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                <h3 className="font-semibold text-[var(--color-primary)] mb-2 text-sm">Tip</h3>
                <p className="text-sm text-[var(--color-muted)]">
                  Practice on the original platform for the best experience. Track your progress here by marking problems as attempted after you solve them.
                </p>
              </div>
            </div>
          </div>

          {/* Code Editor */}
          <div className="dashboard-card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-heading !mb-0">
                <Code className="w-4 h-4 text-[var(--color-primary)]" />
                Scratch Pad
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col min-h-[400px]">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Write your solution here...&#10;// This is a scratch pad for your notes and code.&#10;// Submit your actual solution on the original platform."
                className="flex-1 w-full p-4 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] text-[var(--color-foreground)] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
                spellCheck="false"
              />
              
              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="text-sm text-[var(--color-muted)]">
                  {code.length > 0 ? `${code.split('\n').length} lines` : 'Start typing...'}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-foreground)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Run on {question.platform || 'Platform'}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitted}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      submitted
                        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                        : 'bg-[var(--color-accent)] text-white hover:opacity-90'
                    }`}
                  >
                    {submitted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Marked Done
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Mark as Attempted
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default PracticePage

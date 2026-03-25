import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, BookOpen, Code, Award } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from './ProgressBar.jsx'
import { updateRoadmapProgress } from '../utils/api.js'

// XP values for gamification
const XP_VALUES = {
  TOPIC_COMPLETION: 50,
  SUBTOPIC_COMPLETION: 10
}

function TopicAccordion({ 
  topic, 
  courseId, 
  completedSubtopics = [], 
  roadmapType = 'PNL',
  onTopicComplete
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [localCompletedSubtopics, setLocalCompletedSubtopics] = useState(completedSubtopics)
  const navigate = useNavigate()
  
  const subtopics = topic.subtopics || []
  const completedCount = localCompletedSubtopics.length
  const totalCount = subtopics.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isTopicCompleted = completedCount === totalCount && totalCount > 0

  const handleMarkSubtopicComplete = async (e, subtopicName) => {
    e.stopPropagation()
    if (localCompletedSubtopics.includes(subtopicName)) return
    
    try {
      // Create topic key in format "TopicName::SubtopicName"
      const topicKey = `${topic.name}::${subtopicName}`
      
      // DEBUG: Log the progress update
      console.log('[v0] Marking subtopic complete:', topicKey, 'for course:', courseId)
      
      // Update progress in backend using the new roadmap pipeline
      const response = await updateRoadmapProgress(courseId, topicKey, true)
      console.log('[v0] Backend response:', response)
      
      // Update local state
      setLocalCompletedSubtopics(prev => [...prev, subtopicName])
      
      // Notify parent to refresh progress
      if (onTopicComplete) {
        onTopicComplete(topic.name, XP_VALUES.SUBTOPIC_COMPLETION)
      }
    } catch (error) {
      console.error('Failed to mark subtopic complete:', error)
    }
  }

  const handleSubtopicClick = (subtopic) => {
    // Navigate to the topic detail page with the subtopic
    const topicSlug = encodeURIComponent(topic.name)
    navigate(`/roadmap-engine/topic/${courseId}/${topicSlug}`, {
      state: { subtopic, topic, roadmapType }
    })
  }

  return (
    <div className="dashboard-card !p-0 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--color-surface-raised)]/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-[var(--color-primary)]" />
            ) : (
              <ChevronRight className="w-5 h-5 text-[var(--color-muted)]" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-[var(--color-foreground)] truncate">
                {topic.name}
              </h3>
              {isTopicCompleted && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-[var(--color-success)]/20 text-[var(--color-success)] rounded-full">
                  Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-[var(--color-muted)]">
                {completedCount}/{totalCount} subtopics
              </span>
              <div className="flex-1 max-w-32">
                <ProgressBar progress={progressPercent} size="small" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          {isTopicCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-surface-raised)] text-[var(--color-muted)] rounded-lg">
              <Award className="w-3.5 h-3.5" />
              {XP_VALUES.SUBTOPIC_COMPLETION} XP/subtopic
            </div>
          )}
          <span className="text-sm font-medium text-[var(--color-primary)]">
            {Math.round(progressPercent)}%
          </span>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-background)]/50">
          {subtopics.map((subtopic, index) => {
            const isCompleted = localCompletedSubtopics.includes(subtopic.name)
            const hasPractice = subtopic.practice?.length > 0 || subtopic.questions?.length > 0
            const hasLearning = subtopic.learningResources?.length > 0

            return (
              <div
                key={index}
                onClick={() => handleSubtopicClick(subtopic)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-raised)]/30 cursor-pointer transition-colors border-b border-[var(--color-border)]/50 last:border-b-0"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubtopicClick(subtopic)
                }}
              >
                <div className="flex-shrink-0 pl-8">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  ) : (
                    <button
                      onClick={(e) => handleMarkSubtopicComplete(e, subtopic.name)}
                      className="hover:scale-110 transition-transform"
                      title="Mark as complete"
                    >
                      <Circle className="w-4 h-4 text-[var(--color-muted)] hover:text-[var(--color-primary)]" />
                    </button>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isCompleted ? 'text-[var(--color-muted)] line-through' : 'text-[var(--color-foreground)]'}`}>
                    {subtopic.name}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {hasLearning && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded">
                      <BookOpen className="w-3 h-3" />
                      Learn
                    </span>
                  )}
                  {hasPractice && (
                    <span className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded">
                      <Code className="w-3 h-3" />
                      {subtopic.practice?.length || subtopic.questions?.length}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TopicAccordion

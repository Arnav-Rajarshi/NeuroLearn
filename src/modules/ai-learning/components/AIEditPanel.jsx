/**
 * AIEditPanel - AI-assisted content editing panel.
 */

import { useState } from 'react'
import { Wand2, Loader2, Check, X, RefreshCw } from 'lucide-react'

function AIEditPanel({ node, onEdit, isEditing }) {
  const [instruction, setInstruction] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const quickActions = [
    { label: 'Simplify', instruction: 'Make the content simpler and easier to understand' },
    { label: 'Add Details', instruction: 'Add more technical details and depth' },
    { label: 'More Examples', instruction: 'Add more practical examples' },
    { label: 'Shorter', instruction: 'Make the content more concise' },
  ]
  
  const handleGenerate = async (customInstruction = instruction) => {
    if (!customInstruction.trim() || !node) return
    
    setIsLoading(true)
    try {
      const result = await onEdit(node.title, customInstruction, {
        definition: node.definition,
        explanation: node.explanation,
        example: node.example,
        application: node.application,
        mistake: node.mistake
      })
      setSuggestion(result)
    } catch (error) {
      console.error('Edit failed:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleApply = () => {
    // The parent component should handle applying the suggestion
    setSuggestion(null)
    setInstruction('')
  }
  
  const handleReject = () => {
    setSuggestion(null)
  }
  
  if (!node) {
    return (
      <div className="p-4 text-center">
        <Wand2 className="w-8 h-8 text-[var(--color-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--color-muted)]">
          Select a topic to use AI editing
        </p>
      </div>
    )
  }
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-[var(--color-foreground)] text-sm">
            AI Assistant
          </h3>
          <p className="text-xs text-[var(--color-muted)]">
            Edit content with AI
          </p>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
          Quick Actions
        </label>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(action => (
            <button
              key={action.label}
              onClick={() => handleGenerate(action.instruction)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom instruction */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wider">
          Custom Instruction
        </label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe how you want to modify the content..."
          className="w-full h-24 px-3 py-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={() => handleGenerate()}
          disabled={!instruction.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Run AI
            </>
          )}
        </button>
      </div>
      
      {/* Suggestion preview */}
      {suggestion && (
        <div className="space-y-3 p-3 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--color-primary)]">
              AI Suggestion
            </span>
            <div className="flex gap-1">
              <button
                onClick={handleApply}
                className="p-1.5 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors"
                title="Apply changes"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleReject}
                className="p-1.5 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 transition-colors"
                title="Reject changes"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleGenerate()}
                className="p-1.5 rounded-lg bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:bg-[var(--color-border)] transition-colors"
                title="Regenerate"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2 text-xs text-[var(--color-muted)]">
            {suggestion.definition && (
              <div>
                <span className="font-medium text-[var(--color-foreground)]">Definition:</span>
                <p className="mt-0.5">{suggestion.definition.slice(0, 100)}...</p>
              </div>
            )}
            {suggestion.explanation && (
              <div>
                <span className="font-medium text-[var(--color-foreground)]">Explanation:</span>
                <p className="mt-0.5">{suggestion.explanation.slice(0, 100)}...</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Tips */}
      <div className="p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-muted)]">
          <span className="font-medium text-[var(--color-foreground)]">Tips:</span> Try instructions like "explain for beginners", "add code examples", or "focus on practical applications".
        </p>
      </div>
    </div>
  )
}

export default AIEditPanel

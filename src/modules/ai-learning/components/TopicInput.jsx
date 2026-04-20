/**
 * TopicInput - Search input component for generating AI topic trees.
 */

import { useState } from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'

function TopicInput({ onGenerate, isLoading }) {
  const [topic, setTopic] = useState('')
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (topic.trim() && !isLoading) {
      onGenerate(topic.trim())
    }
  }
  
  const suggestions = [
    'Machine Learning',
    'Web Development',
    'Data Structures',
    'Quantum Computing',
    'Blockchain Technology'
  ]
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter any topic to explore..."
            className="w-full h-14 pl-12 pr-36 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all text-lg"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!topic.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Quick suggestions */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <span className="text-sm text-[var(--color-muted)]">Try:</span>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => setTopic(suggestion)}
            disabled={isLoading}
            className="px-3 py-1 text-sm rounded-full bg-[var(--color-surface-raised)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

export default TopicInput

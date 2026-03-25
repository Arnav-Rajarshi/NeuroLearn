/**
 * KnowledgeNode - Display detailed content for a selected node.
 */

import { BookOpen, Lightbulb, Code, Briefcase, AlertTriangle, Loader2 } from 'lucide-react'
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

function ContentSection({ icon: Icon, title, content, color }) {
  if (!content) return null

  let formattedContent = content

  // Convert array → markdown list
  if (Array.isArray(content)) {
    formattedContent = content.map(item => `- ${item}`).join("\n")
  }

  // Convert object → structured markdown
  if (typeof content === "object" && !Array.isArray(content)) {
    formattedContent = Object.entries(content)
      .map(([key, value]) => `### ${key}\n${value}`)
      .join("\n\n")
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="font-heading font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
      </div>

      {/* 🔥 UNIVERSAL MARKDOWN RENDERER */}
      <div className="pl-10 prose prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        >
          {formattedContent}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-raised)]" />
            <div className="h-5 w-24 bg-[var(--color-surface-raised)] rounded" />
          </div>
          <div className="pl-10 space-y-2">
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-full" />
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-5/6" />
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-raised)] flex items-center justify-center mb-4">
        <BookOpen className="w-8 h-8 text-[var(--color-muted)]" />
      </div>
      <h3 className="text-lg font-heading font-semibold text-[var(--color-foreground)] mb-2">
        Select a Topic
      </h3>
      <p className="text-[var(--color-muted)] text-sm max-w-xs">
        Click on any topic in the tree to view its detailed content and learning materials.
      </p>
    </div>
  )
}

function KnowledgeNode({ node }) {
  if (!node) {
    return <EmptyState />
  }

  if (node.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" />
          <span className="text-[var(--color-muted)]">Loading content...</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!node.hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
        </div>
        <h3 className="text-lg font-heading font-semibold text-[var(--color-foreground)] mb-2">
          Loading Content
        </h3>
        <p className="text-[var(--color-muted)] text-sm">
          Generating detailed content for {node.title}...
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-[var(--color-accent)] mb-2">
          <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10">
            Level {node.level}
          </span>
        </div>
        <h2 className="text-2xl font-heading font-bold text-[var(--color-foreground)]">
          {node.title}
        </h2>
      </div>

      {/* Content Sections */}
      <div className="space-y-2">
        <ContentSection icon={BookOpen} title="Definition" content={node.definition} color="bg-[var(--color-primary)]/10 text-[var(--color-primary)]" />
        <ContentSection icon={Lightbulb} title="Explanation" content={node.explanation} color="bg-[var(--color-accent)]/10 text-[var(--color-accent)]" />
        <ContentSection icon={Code} title="Example" content={node.example} color="bg-[var(--color-success)]/10 text-[var(--color-success)]" />
        <ContentSection icon={Briefcase} title="Application" content={node.application} color="bg-[var(--color-warning)]/10 text-[var(--color-warning)]" />
        <ContentSection icon={AlertTriangle} title="Common Mistakes" content={node.mistake} color="bg-[var(--color-danger)]/10 text-[var(--color-danger)]" />
      </div>

      {/* Subtopics */}
      {node.subtopics && node.subtopics.length > 0 && (
        <div className="mt-8 p-4 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border)]">
          <h4 className="text-sm font-semibold text-[var(--color-foreground)] mb-2">
            Related Subtopics
          </h4>
          <div className="flex flex-wrap gap-2">
            {node.subtopics.slice(0, 5).map((subtopic, i) => (
              <span key={i} className="px-3 py-1 text-xs rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)]">
                {subtopic}
              </span>
            ))}
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-2">
            Click to expand in the tree sidebar
          </p>
        </div>
      )}
    </div>
  )
}

export default KnowledgeNode
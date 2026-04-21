/**
 * AILearningPage - Main page for AI-powered learning path generator.
 * Three-panel layout: Tree sidebar | Content center | AI Panel right
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, GraduationCap, Sparkles, PanelRightOpen, PanelRightClose, RefreshCw } from 'lucide-react'

import TopicInput from './components/TopicInput'
import KnowledgeTree from './components/KnowledgeTree'
import KnowledgeNode from './components/KnowledgeNode'
import AIEditPanel from './components/AIEditPanel'
import useKnowledgeStore from './hooks/useKnowledgeStore'
import { generateTopic, expandNode, generateNodeContent, editCard } from './api/aiLearningApi'

function AILearningPage() {
  const navigate = useNavigate()
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  
  const {
    nodes,
    selectedNodeId,
    isGenerating,
    error,
    setRootTopic,
    addChildNodes,
    updateNodeContent,
    setNodeLoading,
    expandNode: expandNodeInStore,
    setGenerating,
    setError,
    clearError,
    reset
  } = useKnowledgeStore()
  
  const selectedNode = nodes[selectedNodeId] || null
  
  // Handle initial topic generation
  const handleGenerateTopic = async (topic) => {
    try {
      setGenerating(true)
      clearError()
      reset() // Clear previous tree
      
      const result = await generateTopic(topic)
      const rootId = setRootTopic(result)
      
      // Add child nodes for subtopics
      if (result.subtopics && result.subtopics.length > 0) {
        addChildNodes(rootId, result.subtopics)
        expandNodeInStore(rootId)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate topic')
    } finally {
      setGenerating(false)
    }
  }
  
  // Handle expanding a node to get subtopics
  const handleExpandNode = async (nodeId, topic) => {
    const node = nodes[nodeId]
    if (!node) return
    
    // Check if already has children
    const hasChildren = Object.values(nodes).some(n => n.parentId === nodeId)
    if (hasChildren) {
      // Just toggle expansion
      useKnowledgeStore.getState().toggleExpanded(nodeId)
      return
    }
    
    try {
      setNodeLoading(nodeId, true)
      
      const parentTopic = node.parentId ? nodes[node.parentId]?.title : null
      const result = await expandNode(topic, parentTopic)
      
      if (result.subtopics && result.subtopics.length > 0) {
        addChildNodes(nodeId, result.subtopics)
        expandNodeInStore(nodeId)
      }
    } catch (err) {
      setError(err.message || 'Failed to expand node')
    } finally {
      setNodeLoading(nodeId, false)
    }
  }
  
  // Handle loading content for a node
  const handleLoadContent = async (nodeId, topic, parentId) => {
    const node = nodes[nodeId]
    if (!node || node.hasContent) return
    
    try {
      setNodeLoading(nodeId, true)
      
      const parentTopic = parentId ? nodes[parentId]?.title : null
      const content = await generateNodeContent(topic, parentTopic)
      
      // Also get subtopics
      const expandResult = await expandNode(topic, parentTopic)
      
      updateNodeContent(nodeId, {
        ...content,
        subtopics: expandResult.subtopics || []
      })
      
      // Add child nodes
      if (expandResult.subtopics && expandResult.subtopics.length > 0) {
        addChildNodes(nodeId, expandResult.subtopics)
      }
    } catch (err) {
      setError(err.message || 'Failed to load content')
      setNodeLoading(nodeId, false)
    }
  }
  
  // Handle AI editing
  const handleEdit = async (topic, instruction, content) => {
    try {
      setIsEditing(true)
      const result = await editCard(topic, instruction, content)
      
      // Update the node with new content
      if (selectedNodeId) {
        updateNodeContent(selectedNodeId, result)
      }
      
      return result
    } catch (err) {
      setError(err.message || 'Failed to edit content')
      throw err
    } finally {
      setIsEditing(false)
    }
  }
  
  // Handle reset
  const handleReset = () => {
    reset()
  }
  
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back + Logo */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/roadmap-engine/courses')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-heading text-lg font-bold text-[var(--color-foreground)]">
                    AI Learning Path
                  </h1>
                  <p className="text-xs text-[var(--color-muted)]">Explore any topic</p>
                </div>
              </div>
            </div>
            
            {/* Center: Topic Input */}
            <div className="flex-1 max-w-xl mx-8 hidden md:block">
              <TopicInput onGenerate={handleGenerateTopic} isLoading={isGenerating} />
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {Object.keys(nodes).length > 0 && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-colors"
                  title="Reset tree"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setShowAIPanel(!showAIPanel)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)] transition-colors"
                title={showAIPanel ? 'Hide AI Panel' : 'Show AI Panel'}
              >
                {showAIPanel ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile topic input */}
          <div className="mt-4 md:hidden">
            <TopicInput onGenerate={handleGenerateTopic} isLoading={isGenerating} />
          </div>
        </div>
      </header>
      
      {/* Error banner */}
      {error && (
        <div className="bg-[var(--color-danger)]/10 border-b border-[var(--color-danger)]/20 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
            <button
              onClick={clearError}
              className="text-[var(--color-danger)] hover:text-[var(--color-danger)]/80"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Tree sidebar */}
        <aside className="w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto flex-shrink-0">
          <KnowledgeTree 
            onExpandNode={handleExpandNode}
            onLoadContent={handleLoadContent}
          />
        </aside>
        
        {/* Content area */}
        <div className="flex-1 overflow-hidden bg-[var(--color-background)]">
          {Object.keys(nodes).length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center mb-6">
                <GraduationCap className="w-10 h-10 text-[var(--color-primary)]" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-[var(--color-foreground)] mb-3">
                Start Your Learning Journey
              </h2>
              <p className="text-[var(--color-muted)] max-w-md mb-6">
                Enter any topic above and our AI will generate a comprehensive knowledge tree with explanations, examples, and learning paths.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Machine Learning', 'React Hooks', 'Database Design'].map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleGenerateTopic(topic)}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-primary)] transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <KnowledgeNode node={selectedNode} />
            </div>
          )}
        </div>
        
        {/* AI Panel */}
        {showAIPanel && (
          <aside className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto flex-shrink-0">
            <AIEditPanel 
              node={selectedNode}
              onEdit={handleEdit}
              isEditing={isEditing}
            />
          </aside>
        )}
      </main>
    </div>
  )
}

export default AILearningPage

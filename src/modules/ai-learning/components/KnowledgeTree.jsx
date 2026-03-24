/**
 * KnowledgeTree - Collapsible tree navigation sidebar.
 */

import { ChevronRight, ChevronDown, Circle, Loader2, BookOpen } from 'lucide-react'
import useKnowledgeStore from '../hooks/useKnowledgeStore'

function TreeNode({ node, onSelect, onExpand, onLoadContent, isSelected, isExpanded, hasChildren }) {
  const indent = node.level * 16
  
  const handleClick = () => {
    onSelect(node.id)
    if (!node.hasContent && !node.isLoading) {
      onLoadContent(node.id, node.title, node.parentId)
    }
  }
  
  const handleExpandClick = (e) => {
    e.stopPropagation()
    if (!hasChildren && !node.isLoading) {
      onExpand(node.id, node.title)
    } else {
      // Just toggle expansion
      useKnowledgeStore.getState().toggleExpanded(node.id)
    }
  }
  
  return (
    <div
      onClick={handleClick}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-colors ${
        isSelected 
          ? 'bg-[var(--color-primary)]/20 text-[var(--color-foreground)]' 
          : 'hover:bg-[var(--color-surface-raised)] text-[var(--color-muted)]'
      }`}
      style={{ paddingLeft: `${12 + indent}px` }}
    >
      {/* Expand/Collapse button */}
      <button
        onClick={handleExpandClick}
        className="w-5 h-5 flex items-center justify-center hover:bg-[var(--color-border)] rounded transition-colors"
      >
        {node.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)]" />
        ) : hasChildren || node.subtopics?.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )
        ) : (
          <Circle className="w-2 h-2 fill-current" />
        )}
      </button>
      
      {/* Node icon */}
      <BookOpen className={`w-4 h-4 flex-shrink-0 ${
        isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
      }`} />
      
      {/* Node title */}
      <span className={`text-sm truncate ${
        isSelected ? 'font-medium text-[var(--color-foreground)]' : ''
      }`}>
        {node.title}
      </span>
      
      {/* Content status indicator */}
      {node.hasContent && (
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] flex-shrink-0 ml-auto" />
      )}
    </div>
  )
}

function KnowledgeTree({ onExpandNode, onLoadContent }) {
  const { 
    nodes, 
    selectedNodeId, 
    expandedNodeIds,
    rootNodeId
  } = useKnowledgeStore()
  
  const selectNode = useKnowledgeStore((state) => state.selectNode)
  
  // Build flat list for rendering with proper depth
  const buildFlatList = () => {
    if (!rootNodeId) return []
    
    const result = []
    
    const traverse = (nodeId) => {
      const node = nodes[nodeId]
      if (!node) return
      
      result.push(node)
      
      // If expanded, add children
      if (expandedNodeIds.has(nodeId)) {
        // Find child nodes
        const children = Object.values(nodes)
          .filter(n => n.parentId === nodeId)
          .sort((a, b) => a.title.localeCompare(b.title))
        
        children.forEach(child => traverse(child.id))
      }
    }
    
    traverse(rootNodeId)
    return result
  }
  
  const flatList = buildFlatList()
  
  // Check if a node has children in the store
  const hasChildren = (nodeId) => {
    return Object.values(nodes).some(n => n.parentId === nodeId)
  }
  
  if (flatList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <BookOpen className="w-12 h-12 text-[var(--color-muted)] mb-3" />
        <p className="text-[var(--color-muted)] text-sm">
          Enter a topic above to start building your knowledge tree
        </p>
      </div>
    )
  }
  
  return (
    <div className="py-2">
      <div className="px-3 py-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Knowledge Tree
        </h3>
      </div>
      <div className="space-y-0.5">
        {flatList.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            onSelect={selectNode}
            onExpand={onExpandNode}
            onLoadContent={onLoadContent}
            isSelected={selectedNodeId === node.id}
            isExpanded={expandedNodeIds.has(node.id)}
            hasChildren={hasChildren(node.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default KnowledgeTree

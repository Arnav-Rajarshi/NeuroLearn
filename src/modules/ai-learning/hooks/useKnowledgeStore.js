/**
 * Zustand store for AI Learning module state management.
 * Manages nodes, selection state, and tree expansion.
 */

import { create } from 'zustand'

/**
 * @typedef {Object} NodeData
 * @property {string} id - Unique node identifier
 * @property {string} title - Node title
 * @property {string} definition - Definition content
 * @property {string} explanation - Explanation content
 * @property {string} example - Example content
 * @property {string} application - Application content
 * @property {string} mistake - Common mistakes content
 * @property {string[]} subtopics - Child subtopic titles
 * @property {string|null} parentId - Parent node ID
 * @property {number} level - Tree depth level
 * @property {boolean} isLoading - Whether content is loading
 * @property {boolean} hasContent - Whether detailed content is loaded
 */

const useKnowledgeStore = create((set, get) => ({
  // State
  nodes: {},                    // Map of nodeId -> NodeData
  rootNodeId: null,             // ID of the root node
  selectedNodeId: null,         // Currently selected node
  expandedNodeIds: new Set(),   // Set of expanded node IDs
  isGenerating: false,          // Whether initial generation is in progress
  error: null,                  // Last error message

  // Actions
  
  /**
   * Set the root topic and initialize the tree
   */
  setRootTopic: (topicData) => {
    const rootId = `node-${Date.now()}`
    const rootNode = {
      id: rootId,
      title: topicData.title,
      definition: topicData.definition,
      explanation: topicData.explanation,
      example: topicData.example,
      application: topicData.application,
      mistake: topicData.mistake,
      subtopics: topicData.subtopics || [],
      parentId: null,
      level: 0,
      isLoading: false,
      hasContent: true
    }
    
    set({
      nodes: { [rootId]: rootNode },
      rootNodeId: rootId,
      selectedNodeId: rootId,
      expandedNodeIds: new Set([rootId]),
      error: null
    })
    
    return rootId
  },
  
  /**
   * Add child nodes when expanding a parent
   */
  addChildNodes: (parentId, subtopics) => {
    const state = get()
    const parentNode = state.nodes[parentId]
    if (!parentNode) return
    
    const newNodes = { ...state.nodes }
    const childIds = []
    
    subtopics.forEach((title, index) => {
      const childId = `node-${Date.now()}-${index}`
      childIds.push(childId)
      
      newNodes[childId] = {
        id: childId,
        title,
        definition: '',
        explanation: '',
        example: '',
        application: '',
        mistake: '',
        subtopics: [],
        parentId,
        level: parentNode.level + 1,
        isLoading: false,
        hasContent: false
      }
    })
    
    // Update parent's subtopics to reference child IDs
    newNodes[parentId] = {
      ...parentNode,
      childIds
    }
    
    set({ nodes: newNodes })
    return childIds
  },
  
  /**
   * Update a node's content
   */
  updateNodeContent: (nodeId, content) => {
    const state = get()
    const node = state.nodes[nodeId]
    if (!node) return
    
    set({
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...node,
          ...content,
          hasContent: true,
          isLoading: false
        }
      }
    })
  },
  
  /**
   * Set node loading state
   */
  setNodeLoading: (nodeId, isLoading) => {
    const state = get()
    const node = state.nodes[nodeId]
    if (!node) return
    
    set({
      nodes: {
        ...state.nodes,
        [nodeId]: { ...node, isLoading }
      }
    })
  },
  
  /**
   * Select a node
   */
  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId })
  },
  
  /**
   * Toggle node expansion
   */
  toggleExpanded: (nodeId) => {
    const state = get()
    const newExpanded = new Set(state.expandedNodeIds)
    
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    
    set({ expandedNodeIds: newExpanded })
  },
  
  /**
   * Expand a node (add to expanded set)
   */
  expandNode: (nodeId) => {
    const state = get()
    const newExpanded = new Set(state.expandedNodeIds)
    newExpanded.add(nodeId)
    set({ expandedNodeIds: newExpanded })
  },
  
  /**
   * Set global generating state
   */
  setGenerating: (isGenerating) => {
    set({ isGenerating })
  },
  
  /**
   * Set error message
   */
  setError: (error) => {
    set({ error })
  },
  
  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null })
  },
  
  /**
   * Reset the entire store
   */
  reset: () => {
    set({
      nodes: {},
      rootNodeId: null,
      selectedNodeId: null,
      expandedNodeIds: new Set(),
      isGenerating: false,
      error: null
    })
  },
  
  /**
   * Get the selected node data
   */
  getSelectedNode: () => {
    const state = get()
    return state.nodes[state.selectedNodeId] || null
  },
  
  /**
   * Get all nodes as a flat array (for tree rendering)
   */
  getNodesArray: () => {
    const state = get()
    return Object.values(state.nodes)
  },
  
  /**
   * Get child nodes of a parent
   */
  getChildNodes: (parentId) => {
    const state = get()
    return Object.values(state.nodes).filter(node => node.parentId === parentId)
  },

  /**
   * Build tree structure for rendering
   */
  getTreeStructure: () => {
    const state = get()
    const { nodes, rootNodeId } = state
    
    if (!rootNodeId || !nodes[rootNodeId]) return []
    
    const buildTree = (nodeId, depth = 0) => {
      const node = nodes[nodeId]
      if (!node) return []
      
      const result = [{ ...node, depth }]
      
      // Get children (nodes where parentId matches)
      const children = Object.values(nodes)
        .filter(n => n.parentId === nodeId)
        .sort((a, b) => a.title.localeCompare(b.title))
      
      if (state.expandedNodeIds.has(nodeId)) {
        children.forEach(child => {
          result.push(...buildTree(child.id, depth + 1))
        })
      }
      
      return result
    }
    
    return buildTree(rootNodeId)
  }
}))

export default useKnowledgeStore

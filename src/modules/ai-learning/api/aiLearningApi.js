/**
 * API functions for AI Learning module.
 * Communicates with the backend AI Learning endpoints.
 */

const API_BASE_URL ='https://neurolearn-wi5m.onrender.com'

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('neurolearn_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Generate a complete topic tree with content and subtopics.
 * @param {string} topic - The topic to generate
 * @returns {Promise<Object>} Topic response with title, content, and subtopics
 */
export async function generateTopic(topic) {
  const response = await fetch(`${API_BASE_URL}/ai-learning/generate-topic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ topic })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate topic')
  }
  
  return response.json()
}

/**
 * Expand a node to get its subtopics.
 * @param {string} topic - The topic to expand
 * @param {string} parentTopic - Optional parent topic for context
 * @returns {Promise<Object>} Response with subtopics array
 */
export async function expandNode(topic, parentTopic = null) {
  const response = await fetch(`${API_BASE_URL}/ai-learning/expand-node`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ 
      topic, 
      parent_topic: parentTopic 
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to expand node')
  }
  
  return response.json()
}

/**
 * Generate detailed content for a node.
 * @param {string} topic - The topic to get content for
 * @param {string} parentTopic - Optional parent topic for context
 * @returns {Promise<Object>} Content with definition, explanation, example, etc.
 */
export async function generateNodeContent(topic, parentTopic = null) {
  const response = await fetch(`${API_BASE_URL}/ai-learning/generate-node-content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ 
      topic, 
      parent_topic: parentTopic 
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate content')
  }
  
  return response.json()
}

/**
 * Edit card content using AI assistance.
 * @param {string} topic - The topic being edited
 * @param {string} instruction - User's editing instruction
 * @param {Object} content - Current content to modify
 * @returns {Promise<Object>} Updated content
 */
export async function editCard(topic, instruction, content) {
  const response = await fetch(`${API_BASE_URL}/ai-learning/edit-card`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ 
      topic, 
      instruction, 
      content 
    })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to edit content')
  }
  
  return response.json()
}

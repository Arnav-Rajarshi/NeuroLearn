// API utility for communicating with FastAPI backend
import { getCid } from '../constants/courseMap.js'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('neurolearn_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Generic fetch wrapper with error handling
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        throw new Error(`Request failed with status ${response.status}`)
      }

      // Extract a human-readable error message
      let message = "API request failed"

      if (typeof errorData?.detail === "string") {
        // Simple string detail (e.g., "Invalid credentials")
        message = errorData.detail
      } else if (Array.isArray(errorData?.detail)) {
        // FastAPI validation errors: [{loc: [...], msg: "...", type: "..."}]
        const firstError = errorData.detail[0]
        if (firstError?.msg) {
          message = firstError.msg
        } else {
          message = "Validation error"
        }
      } else if (typeof errorData?.detail === "object" && errorData.detail !== null) {
        // Object detail - extract message field or stringify
        message = errorData.detail.message || errorData.detail.msg || "Request failed"
      } else if (typeof errorData?.message === "string") {
        message = errorData.message
      } else if (typeof errorData === "string") {
        message = errorData
      }

      throw new Error(message)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message)
    throw error
  }
}

// ============ AUTH API ============

export async function loginUser(email, password) {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password
    }),
  })
  
  // Store token and user data
  localStorage.setItem('neurolearn_token', data.access_token)
  localStorage.setItem('neurolearn_user', JSON.stringify(data.user))
  
  return data
}

export async function signupUser(name, email, password) {
  const data = await fetchApi('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  
  // Store token and user data
  localStorage.setItem('neurolearn_token', data.access_token)
  localStorage.setItem('neurolearn_user', JSON.stringify(data.user))
  
  return data
}

export async function getCurrentUser() {
  return await fetchApi('/auth/me')
}

export async function getPremiumStatus() {
  try {
    const data = await fetchApi('/auth/premium-status')
    return data.is_premium
  } catch (error) {
    return false
  }
}

export function logout() {
  localStorage.removeItem('neurolearn_token')
  localStorage.removeItem('neurolearn_user')
}

export function getStoredUser() {
  const userStr = localStorage.getItem('neurolearn_user')
  return userStr ? JSON.parse(userStr) : null
}

export function getToken() {
  return localStorage.getItem('neurolearn_token')
}

export function isAuthenticated() {
  return !!getToken()
}

// ============ PREMIUM/PAYMENTS API ============

export async function createRazorpayOrder() {
  return await fetchApi('/payments/create-order')
}

export async function verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
  return await fetchApi('/payments/verify-payment', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  })
}

export async function getPaymentHistory() {
  return await fetchApi('/payments/history')
}

// ============ PROGRESS API ============

export async function updateProgress(progressData) {
  return await fetchApi('/progress/update', {
    method: 'POST',
    body: JSON.stringify(progressData),
  })
}

export async function getUserProgress(userId) {
  return await fetchApi(`/progress/${userId}`)
}

export async function getCourseProgress(courseIdOrSlug) {
  try {
    const cid = getCid(courseIdOrSlug)
    const data = await fetchApi(`/progress/course/${cid}`)
    // Calculate completed count from progress_json
    const progressJson = data.progress_json || {}
    let completed = 0
    for (const topic in progressJson) {
      if (Array.isArray(progressJson[topic])) {
        completed += progressJson[topic].length
      }
    }
    return {
      ...data,
      completed
    }
  } catch (error) {
    return { completed: 0, progress_json: {} }
  }
}

export async function updateCourseProgress(courseIdOrSlug, topic, subtopic) {
  const cid = getCid(courseIdOrSlug)
  // First get current progress
  const current = await getCourseProgress(cid)
  const progressJson = current.progress_json || {}
  
  // Add subtopic to topic array if not already present
  if (!progressJson[topic]) {
    progressJson[topic] = []
  }
  if (!progressJson[topic].includes(subtopic)) {
    progressJson[topic].push(subtopic)
  }
  
  return await fetchApi('/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      cid,
      progress_json: progressJson
    }),
  })
}

// ============ COURSE PREFERENCES API ============

export async function getCoursePreferences(courseIdOrSlug) {
  try {
    const cid = getCid(courseIdOrSlug)
    return await fetchApi(`/courses/preferences/${cid}`)
  } catch (error) {
    return null
  }
}

export async function saveCoursePreferences(data) {
  // Convert slug to cid if needed
  const payload = {
    ...data,
    cid: getCid(data.cid),
  }
  return await fetchApi('/courses/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getEnrolledCourses() {
  return await fetchApi('/courses/enrolled')
}

export async function enrollInCourse(courseIdOrSlug) {
  const cid = getCid(courseIdOrSlug)
  return await fetchApi(`/courses/enroll/${cid}`, {
    method: 'POST',
  })
}

// ============ ROADMAP API ============
// New roadmap pipeline: JSON is source of truth, DB stores only user progress

/**
 * Get full roadmap with structure and user progress
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmap(courseIdOrSlug, lm = 'PNL') {
  const cid = getCid(courseIdOrSlug)
  return await fetchApi(`/roadmap/${cid}?lm=${lm}`)
}

/**
 * Get roadmap progress summary (lighter than full roadmap)
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmapProgress(courseIdOrSlug, lm = 'PNL') {
  const cid = getCid(courseIdOrSlug)
  try {
    return await fetchApi(`/roadmap/${cid}/progress?lm=${lm}`)
  } catch (error) {
    return {
      cid,
      total_topics: 0,
      completed_topics: 0,
      completion_percentage: 0,
      progress: {},
      topics_to_be_shown: [],
      current_topic: null
    }
  }
}

/**
 * Mark a topic as complete or incomplete
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} topicKey - Topic key in format "TopicName::SubtopicName"
 * @param {boolean} completed - Whether the topic is completed
 */
export async function updateRoadmapProgress(courseIdOrSlug, topicKey, completed = true) {
  const cid = getCid(courseIdOrSlug)
  return await fetchApi('/roadmap/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      cid,
      topic_key: topicKey,
      completed
    }),
  })
}

/**
 * Get all topic keys for a course roadmap
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmapTopics(courseIdOrSlug, lm = 'PNL') {
  const cid = getCid(courseIdOrSlug)
  return await fetchApi(`/roadmap/${cid}/topics?lm=${lm}`)
}

/**
 * Reset all progress for a course
 * @param {string|number} courseIdOrSlug - Course slug or cid
 */
export async function resetRoadmapProgress(courseIdOrSlug) {
  const cid = getCid(courseIdOrSlug)
  return await fetchApi(`/roadmap/${cid}/reset`, {
    method: 'POST',
  })
}

// ============ ADMIN API ============

export async function getAdminDashboard() {
  return await fetchApi('/admin/dashboard')
}

export async function getAllUsers(skip = 0, limit = 50) {
  return await fetchApi(`/admin/users?skip=${skip}&limit=${limit}`)
}

export async function getAllPayments(skip = 0, limit = 50) {
  return await fetchApi(`/admin/payments?skip=${skip}&limit=${limit}`)
}

export async function toggleUserPremium(uid) {
  return await fetchApi(`/admin/users/${uid}/toggle-premium`, {
    method: 'POST',
  })
}

export async function getCourseStats() {
  return await fetchApi('/admin/stats/courses')
}

export { API_BASE_URL }

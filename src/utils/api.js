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

// ============ COURSES API ============

// Cache for backend courses data
let _coursesCache = null
let _coursesCachePromise = null

/**
 * Fetch all courses from the backend
 * Returns courses with their real database cid values
 */
export async function fetchBackendCourses() {
  // Return cached data if available
  if (_coursesCache) {
    return _coursesCache
  }
  
  // If a fetch is already in progress, wait for it
  if (_coursesCachePromise) {
    return _coursesCachePromise
  }
  
  // Start new fetch
  _coursesCachePromise = (async () => {
    try {
      const courses = await fetchApi('/courses/')
      _coursesCache = courses
      console.log("[v0] Fetched backend courses:", courses)
      return courses
    } catch (error) {
      console.error("[v0] Failed to fetch backend courses:", error)
      _coursesCachePromise = null
      throw error
    }
  })()
  
  return _coursesCachePromise
}

/**
 * Get the real cid for a course slug or name from the backend
 * @param {string} courseIdOrSlug - Course slug (e.g., "python") or name (e.g., "Python Programming")
 * @returns {Promise<number|null>} - The database cid or null if not found
 */
export async function getBackendCid(courseIdOrSlug) {
  if (!courseIdOrSlug) {
    console.error("[v0] Invalid CID: courseIdOrSlug is empty or null")
    return null
  }
  
  // If it's already a number, validate it exists in backend
  if (typeof courseIdOrSlug === 'number') {
    const courses = await fetchBackendCourses()
    const found = courses.find(c => c.cid === courseIdOrSlug)
    if (found) {
      console.log("[v0] Selected CID:", found.cid)
      return found.cid
    }
    console.error("[v0] Invalid CID: numeric cid not found in backend:", courseIdOrSlug)
    return null
  }
  
  // If it's a numeric string, parse and validate
  const numericValue = parseInt(courseIdOrSlug, 10)
  if (!isNaN(numericValue)) {
    const courses = await fetchBackendCourses()
    const found = courses.find(c => c.cid === numericValue)
    if (found) {
      console.log("[v0] Selected CID:", found.cid)
      return found.cid
    }
    console.error("[v0] Invalid CID: numeric string cid not found in backend:", courseIdOrSlug)
    return null
  }
  
  // Look up the slug in the backend courses
  const courses = await fetchBackendCourses()
  
  // Try to find by slug pattern (lowercase, underscore-separated)
  const slug = courseIdOrSlug.toLowerCase().replace(/\s+/g, '_')
  
  // Match by slug-like course name conversion
  const found = courses.find(c => {
    const courseSlug = c.course_name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '').replace(/-/g, '_')
    return courseSlug === slug || 
           c.course_name.toLowerCase() === courseIdOrSlug.toLowerCase() ||
           courseSlug.includes(slug) ||
           slug.includes(courseSlug.split('_')[0])
  })
  
  if (found) {
    console.log("[v0] Selected CID:", found.cid, "for course:", courseIdOrSlug)
    return found.cid
  }
  
  console.error("[v0] Invalid CID: course slug not found in backend:", courseIdOrSlug)
  return null
}

/**
 * Clear the courses cache (useful after login/logout)
 */
export function clearCoursesCache() {
  _coursesCache = null
  _coursesCachePromise = null
}

// ============ ROADMAP API ============
// New roadmap pipeline: JSON is source of truth, DB stores only user progress

/**
 * Get full roadmap with structure and user progress
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmap(courseIdOrSlug, lm = 'PNL') {
  const cid = await getBackendCid(courseIdOrSlug)
  if (!cid) {
    console.error("[v0] Invalid CID - cannot fetch roadmap for:", courseIdOrSlug)
    throw new Error(`Invalid course ID: ${courseIdOrSlug}`)
  }
  console.log("[v0] Fetching roadmap for CID:", cid)
  return await fetchApi(`/roadmap/${cid}?lm=${lm}`)
}

/**
 * Get roadmap progress summary (lighter than full roadmap)
 * @param {string|number} courseIdOrSlug - Course slug or cid
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmapProgress(courseIdOrSlug, lm = 'PNL') {
  const cid = await getBackendCid(courseIdOrSlug)
  if (!cid) {
    console.error("[v0] Invalid CID - cannot fetch roadmap progress for:", courseIdOrSlug)
    return {
      cid: null,
      total_topics: 0,
      completed_topics: 0,
      completion_percentage: 0,
      progress: {},
      topics_to_be_shown: [],
      current_topic: null
    }
  }
  console.log("[v0] Fetching roadmap progress for CID:", cid)
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

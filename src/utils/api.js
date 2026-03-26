// API utility for communicating with FastAPI backend
// CID validation is handled by validateCid() - frontend must ONLY use backend-provided cid values

const API_BASE_URL = 'https://neurolearn-wi5m.onrender.com/'

// Cache for backend courses data (declared early for use in logout)
let _coursesCache = null
let _coursesCachePromise = null

/**
 * Clear the courses cache (useful after login/logout)
 */
export function clearCoursesCache() {
  _coursesCache = null
  _coursesCachePromise = null
}

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('neurolearn_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Generic fetch wrapper with error handling
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    // ✅ HANDLE 404 GRACEFULLY
    if (response.status === 404) {
      console.warn(`[v0] No data found for ${url} (404)`);
      return null;
    }

    // ❌ Handle real errors only
    if (!response.ok) {
      let errorData;

      try {
        errorData = await response.json();
      } catch {
        throw new Error(`Request failed with status ${response.status}`);
      }

      // Extract readable error message
      let message = "API request failed";

      if (typeof errorData?.detail === "string") {
        message = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        const firstError = errorData.detail[0];
        message = firstError?.msg || "Validation error";
      } else if (typeof errorData?.detail === "object" && errorData.detail !== null) {
        message = errorData.detail.message || errorData.detail.msg || "Request failed";
      } else if (typeof errorData?.message === "string") {
        message = errorData.message;
      } else if (typeof errorData === "string") {
        message = errorData;
      }

      throw new Error(message);
    }

    // ✅ SUCCESS
    return await response.json();

  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
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
  // Clear courses cache on logout
  clearCoursesCache()
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

export async function getCourseProgress(cid) {
  try {
    const validCid = await validateCid(cid)
    if (!validCid) {
      console.error("[v0] Invalid CID - cannot fetch course progress for:", cid)
      return { completed: 0, progress_json: {} }
    }
    const data = await fetchApi(`/progress/course/${validCid}`)
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

export async function updateCourseProgress(cid, topic, subtopic) {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot update course progress for:", cid)
    throw new Error(`Invalid course ID: ${cid}`)
  }
  // First get current progress
  const current = await getCourseProgress(validCid)
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
      cid: validCid,
      progress_json: progressJson
    }),
  })
}

// ============ COURSE PREFERENCES API ============

export async function getCoursePreferences(cid) {
  try {
    const validCid = await validateCid(cid)
    if (!validCid) {
      console.error("[v0] Invalid CID - cannot fetch course preferences for:", cid)
      return null
    }
    return await fetchApi(`/courses/preferences/${validCid}`)
  } catch (error) {
    return null
  }
}

export async function saveCoursePreferences(data) {
  const validCid = await validateCid(data.cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot save course preferences for:", data.cid)
    throw new Error(`Invalid course ID: ${data.cid}`)
  }
  const payload = {
    ...data,
    cid: validCid,
  }
  return await fetchApi('/courses/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getEnrolledCourses() {
  return await fetchApi('/courses/enrolled')
}

export async function enrollInCourse(cid) {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot enroll in course:", cid)
    throw new Error(`Invalid course ID: ${cid}`)
  }
  return await fetchApi(`/courses/enroll/${validCid}`, {
    method: 'POST',
  })
}

// ============ COURSES API ============

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
 * Validate and return a CID from the backend courses
 * IMPORTANT: Frontend should ONLY use backend-provided cid values
 * @param {number|string} cid - The course cid (must be a number or numeric string)
 * @returns {Promise<number|null>} - The validated cid or null if not found
 */
export async function validateCid(cid) {
  if (!cid && cid !== 0) {
    console.error("[v0] Invalid CID: cid is empty or null")
    return null
  }
  
  // Parse to number if it's a string
  const numericCid = typeof cid === 'number' ? cid : parseInt(cid, 10)
  
  if (isNaN(numericCid)) {
    console.error("[v0] Invalid CID: cid must be a number, got:", cid)
    return null
  }
  
  // Validate it exists in backend
  const courses = await fetchBackendCourses()
  const found = courses.find(c => c.cid === numericCid)
  
  if (found) {
    return found.cid
  }
  
  console.error("[v0] Invalid CID: cid not found in backend:", numericCid)
  return null
}

/**
 * Get course by cid from backend
 * @param {number} cid - The course cid
 * @returns {Promise<object|null>} - The course object or null if not found
 */
export async function getCourseById(cid) {
  if (!cid && cid !== 0) {
    return null
  }
  
  const numericCid = typeof cid === 'number' ? cid : parseInt(cid, 10)
  if (isNaN(numericCid)) {
    return null
  }
  
  const courses = await fetchBackendCourses()
  return courses.find(c => c.cid === numericCid) || null
}

// ============ ROADMAP API ============
// New roadmap pipeline: JSON is source of truth, DB stores only user progress

/**
 * Get full roadmap with structure and user progress
 * @param {number} cid - Course cid (must be from backend)
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmap(cid, lm = 'PNL') {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot fetch roadmap for:", cid)
    throw new Error(`Invalid course ID: ${cid}`)
  }
  return await fetchApi(`/roadmap/${validCid}?lm=${lm}`)
}

/**
 * Get roadmap progress summary (lighter than full roadmap)
 * @param {number} cid - Course cid (must be from backend)
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmapProgress(cid, lm = 'PNL') {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot fetch roadmap progress for:", cid)
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
  try {
    return await fetchApi(`/roadmap/${validCid}/progress?lm=${lm}`)
  } catch (error) {
    return {
      cid: validCid,
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
 * @param {number} cid - Course cid (must be from backend)
 * @param {string} topicKey - Topic key in format "TopicName::SubtopicName"
 * @param {boolean} completed - Whether the topic is completed
 */
export async function updateRoadmapProgress(cid, topicKey, completed = true) {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot update roadmap progress for:", cid)
    throw new Error(`Invalid course ID: ${cid}`)
  }
  return await fetchApi('/roadmap/progress/update', {
    method: 'POST',
    body: JSON.stringify({
      cid: validCid,
      topic_key: topicKey,
      completed
    }),
  })
}

/**
 * Get all topic keys for a course roadmap
 * @param {number} cid - Course cid (must be from backend)
 * @param {string} lm - Learning mode: 'PNL' or 'PRACTICE'
 */
export async function getRoadmapTopics(cid, lm = 'PNL') {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot fetch roadmap topics for:", cid)
    return []
  }
  return await fetchApi(`/roadmap/${validCid}/topics?lm=${lm}`)
}

/**
 * Reset all progress for a course
 * @param {number} cid - Course cid (must be from backend)
 */
export async function resetRoadmapProgress(cid) {
  const validCid = await validateCid(cid)
  if (!validCid) {
    console.error("[v0] Invalid CID - cannot reset roadmap progress for:", cid)
    throw new Error(`Invalid course ID: ${cid}`)
  }
  return await fetchApi(`/roadmap/${validCid}/reset`, {
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

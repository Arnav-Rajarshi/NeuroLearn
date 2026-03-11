// ─── NeuroLearn · Performance Dashboard · API Service ────────────────────────

// Backend API URL - set VITE_API_URL in environment or defaults to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Fetch all dashboard data in a single request.
 * 
 * @param {string} uid - User ID
 * @param {string} cid - Course ID
 * @returns {Promise<Object>} Dashboard data
 */
export async function fetchDashboardData(uid, cid) {
  const response = await fetch(`${API_BASE_URL}/dashboard/all/${uid}/${cid}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to fetch dashboard data: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch progress data for a user's course.
 * 
 * @param {string} uid - User ID
 * @param {string} cid - Course ID
 * @returns {Promise<Object>} Progress data
 */
export async function fetchProgress(uid, cid) {
  const response = await fetch(`${API_BASE_URL}/dashboard/progress/${uid}/${cid}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to fetch progress: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch metrics for a user's course.
 * 
 * @param {string} uid - User ID
 * @param {string} cid - Course ID
 * @returns {Promise<Object>} Metrics data
 */
export async function fetchMetrics(uid, cid) {
  const response = await fetch(`${API_BASE_URL}/dashboard/metrics/${uid}/${cid}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to fetch metrics: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch all courses enrolled by a user.
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Courses data
 */
export async function fetchUserCourses(uid) {
  const response = await fetch(`${API_BASE_URL}/dashboard/user/${uid}/courses`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to fetch courses: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check API health status.
 * 
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/dashboard/health`);
  
  if (!response.ok) {
    throw new Error('API is not healthy');
  }
  
  return response.json();
}

export default {
  fetchDashboardData,
  fetchProgress,
  fetchMetrics,
  fetchUserCourses,
  checkHealth,
  API_BASE_URL
};

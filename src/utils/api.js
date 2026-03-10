// API utility for communicating with FastAPI backend
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

  const errorData = await response.json()

  console.error("Backend error payload:", errorData)

  let message = "API request failed"

  if (typeof errorData?.detail === "string") {
    message = errorData.detail
  } 
  else if (typeof errorData?.detail === "object") {
    message = JSON.stringify(errorData.detail)
  } 
  else if (errorData?.message) {
    message = errorData.message
  } 
  else {
    message = JSON.stringify(errorData)
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

export async function loginUser(name, password) {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      name,
      email: name,   // backend requires email but you're using username
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

export async function getCourseProgress(cid) {
  try {
    return await fetchApi(`/progress/course/${cid}`)
  } catch (error) {
    return null
  }
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

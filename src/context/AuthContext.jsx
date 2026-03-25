import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
  getStoredUser, 
  getToken, 
  getCurrentUser, 
  logout as apiLogout,
  getPremiumStatus 
} from '../utils/api.js'

const AuthContext = createContext(null)

// Max retry attempts for API calls
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [premium, setPremium] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Retry helper function
  const retryApiCall = useCallback(async (apiCall, retries = MAX_RETRIES) => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await apiCall()
      } catch (error) {
        console.log(`[v0] Auth API call attempt ${i + 1} failed:`, error.message)
        if (i === retries) throw error
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)))
      }
    }
  }, [])

  // Initialize auth state from localStorage
  useEffect(() => {
    async function initAuth() {
      const token = getToken()
      const storedUser = getStoredUser()
      
      if (token && storedUser) {
        // First, set user from localStorage immediately (optimistic)
        setUser(storedUser)
        setPremium(storedUser.acc_status === 'premium')
        setIsAdmin(storedUser.is_admin === true)
        setIsAuthenticated(true)
        
        try {
          // Then verify token is still valid by fetching current user (with retry)
          const currentUser = await retryApiCall(() => getCurrentUser())
          setUser(currentUser)
          setPremium(currentUser.acc_status === 'premium')
          setIsAdmin(currentUser.is_admin === true)
          setIsAuthenticated(true)
          setAuthError(null)
        } catch (error) {
          // Check if it's a network error or auth error
          if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
            // Network error - keep using stored user, don't logout
            setAuthError('Unable to connect to server. Using cached data.')
            // Keep the optimistic state we set above
          } else {
            // Token is actually invalid, clear storage
            apiLogout()
            setUser(null)
            setPremium(false)
            setIsAdmin(false)
            setIsAuthenticated(false)
            setAuthError(null)
          }
        }
      }
      
      setLoading(false)
    }
    
    initAuth()
  }, [retryApiCall])

  const login = (userData, token) => {
    setUser(userData)
    // Check premium based on acc_status field
    setPremium(userData.acc_status === 'premium')
    // Check admin based on is_admin field
    setIsAdmin(userData.is_admin === true)
    setIsAuthenticated(true)
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    setPremium(false)
    setIsAdmin(false)
    setIsAuthenticated(false)
  }

  const updatePremiumStatus = (status) => {
    setPremium(status)
    if (user) {
      const updatedUser = { ...user, acc_status: status ? 'premium' : 'free' }
      setUser(updatedUser)
      // Update stored user
      localStorage.setItem('neurolearn_user', JSON.stringify(updatedUser))
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setPremium(currentUser.acc_status === 'premium')
      setIsAdmin(currentUser.is_admin === true)
      return currentUser
    } catch (error) {
      console.error('Failed to refresh user:', error)
      return null
    }
  }

  const value = {
    user,
    premium,
    isAdmin,
    loading,
    isAuthenticated,
    authError,
    login,
    logout,
    updatePremiumStatus,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

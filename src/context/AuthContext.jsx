import { createContext, useContext, useState, useEffect } from 'react'
import { 
  getStoredUser, 
  getToken, 
  getCurrentUser, 
  logout as apiLogout,
  getPremiumStatus 
} from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [premium, setPremium] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize auth state from localStorage
  useEffect(() => {
    async function initAuth() {
      const token = getToken()
      const storedUser = getStoredUser()
      
      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await getCurrentUser()
          setUser(currentUser)
          setPremium(currentUser.premium)
          setIsAuthenticated(true)
        } catch (error) {
          // Token is invalid, clear storage
          apiLogout()
          setUser(null)
          setPremium(false)
          setIsAuthenticated(false)
        }
      }
      
      setLoading(false)
    }
    
    initAuth()
  }, [])

  const login = (userData, token) => {
    setUser(userData)
    setPremium(userData.premium)
    setIsAuthenticated(true)
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    setPremium(false)
    setIsAuthenticated(false)
  }

  const updatePremiumStatus = (status) => {
    setPremium(status)
    if (user) {
      setUser({ ...user, premium: status })
      // Update stored user
      localStorage.setItem('neurolearn_user', JSON.stringify({ ...user, premium: status }))
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      setPremium(currentUser.premium)
      return currentUser
    } catch (error) {
      console.error('Failed to refresh user:', error)
      return null
    }
  }

  const value = {
    user,
    premium,
    loading,
    isAuthenticated,
    isAdmin: user?.is_admin || false,
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

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Auth Pages
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

// Roadmap Engine Pages
import CourseSelection from './pages/CourseSelection.jsx'
import CourseSetup from './pages/CourseSetup.jsx'
import RoadmapPage from './pages/RoadmapPage.jsx'
import TopicPage from './pages/TopicPage.jsx'
import PracticePage from './pages/PracticePage.jsx'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[var(--color-background)]">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />

          {/* Admin Routes */}
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Roadmap Engine Routes */}
          <Route 
            path="/roadmap-engine/courses" 
            element={
              <ProtectedRoute>
                <CourseSelection />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap-engine/setup/:course" 
            element={
              <ProtectedRoute>
                <CourseSetup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap-engine/roadmap/:course" 
            element={
              <ProtectedRoute>
                <RoadmapPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap-engine/topic/:course/:topic" 
            element={
              <ProtectedRoute>
                <TopicPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap-engine/practice/:course/:question" 
            element={
              <ProtectedRoute>
                <PracticePage />
              </ProtectedRoute>
            } 
          />

          {/* Legacy routes - redirect to new paths */}
          <Route path="/courses" element={<Navigate to="/roadmap-engine/courses" replace />} />
          <Route path="/setup/:course" element={<Navigate to="/roadmap-engine/setup/:course" replace />} />
          <Route path="/roadmap/:course" element={<Navigate to="/roadmap-engine/roadmap/:course" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App

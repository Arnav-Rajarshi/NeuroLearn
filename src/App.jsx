import { Routes, Route, Navigate } from 'react-router-dom'
import CourseSelection from './pages/CourseSelection.jsx'
import CourseSetup from './pages/CourseSetup.jsx'
import RoadmapPage from './pages/RoadmapPage.jsx'
import TopicPage from './pages/TopicPage.jsx'
import PracticePage from './pages/PracticePage.jsx'

function App() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Routes>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseSelection />} />
        <Route path="/setup/:course" element={<CourseSetup />} />
        <Route path="/roadmap/:course" element={<RoadmapPage />} />
        <Route path="/topic/:course/:topic" element={<TopicPage />} />
        <Route path="/practice/:course/:question" element={<PracticePage />} />
      </Routes>
    </div>
  )
}

export default App

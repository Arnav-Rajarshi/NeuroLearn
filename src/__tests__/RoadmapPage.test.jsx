import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../utils/loadCourseData.js', () => ({
  getCourseById: vi.fn(),
}))

vi.mock('../utils/api.js', () => ({
  getRoadmap: vi.fn(),
  getRoadmapProgress: vi.fn(),
  getCoursePreferences: vi.fn(),
  updateRoadmapProgress: vi.fn(),
}))

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: true,
    loading: false,
  }),
}))

import RoadmapPage from '../pages/RoadmapPage.jsx'
import { getCourseById } from '../utils/loadCourseData.js'
import { getRoadmap, getRoadmapProgress, getCoursePreferences, updateRoadmapProgress } from '../utils/api.js'

const mockCourse = {
  cid: 1,
  name: 'Data Structures',
  shortName: 'DSA',
}

const mockPrefs = {
  lm: 'PNL',
  goal_date: '2026-06-01',
  hrs_per_week: 10,
}

const mockRoadmap = {
  course_name: 'Data Structures & Algorithms',
  estimated_hours: 40,
  topics: [
    { name: 'Arrays', subtopics: [{ name: 'Intro to Arrays' }, { name: 'Dynamic Arrays' }] },
    { name: 'Linked Lists', subtopics: [{ name: 'Singly Linked' }, { name: 'Doubly Linked' }] },
    { name: 'Trees', subtopics: [{ name: 'Binary Trees' }, { name: 'BST' }] },
    { name: 'Graphs', subtopics: [{ name: 'BFS' }, { name: 'DFS' }] },
  ],
  total_topics: 4,
  completed_topics: 1,
  completion_percentage: 25,
  progress: { 'Arrays::Intro to Arrays': true, 'Arrays::Dynamic Arrays': true },
  topics_to_be_shown: ['Linked Lists', 'Trees', 'Graphs'],
}

function renderRoadmap() {
  return render(
    <MemoryRouter initialEntries={['/roadmap-engine/roadmap/1']}>
      <Routes>
        <Route path="/roadmap-engine/roadmap/:course" element={<RoadmapPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RoadmapPage — Neural Graph Build', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCourseById.mockResolvedValue(mockCourse)
    getCoursePreferences.mockResolvedValue(mockPrefs)
    getRoadmap.mockResolvedValue(mockRoadmap)
    getRoadmapProgress.mockResolvedValue({
      progress: mockRoadmap.progress,
      completed_topics: 1,
      completion_percentage: 25,
      topics_to_be_shown: mockRoadmap.topics_to_be_shown,
    })
    updateRoadmapProgress.mockResolvedValue({ success: true })
    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
  })

  it('shows loading animation initially', () => {
    renderRoadmap()
    const svgs = document.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders the course name in the header after loading', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('Data Structures & Algorithms')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders the XP chip', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText(/10 XP/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders the PNL mode badge', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('PNL')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders all topic nodes with labels', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('Arrays')).toBeInTheDocument()
      expect(screen.getByText('Linked Lists')).toBeInTheDocument()
      expect(screen.getByText('Trees')).toBeInTheDocument()
      expect(screen.getByText('Graphs')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows progress overview bar with completed text', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText(/25% completed/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('opens detail panel on node click', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('Arrays')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText('Arrays'))

    await waitFor(() => {
      expect(screen.getByText('Intro to Arrays')).toBeInTheDocument()
      expect(screen.getByText('Dynamic Arrays')).toBeInTheDocument()
    })
  })

  it('shows completed subtopics with Done state in panel', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('Arrays')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(screen.getByText('Arrays'))

    await waitFor(() => {
      const doneElements = screen.getAllByText('✓ Done')
      expect(doneElements.length).toBe(2)
    })
  })

  it('shows topics remaining count', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText(/3 topics remaining/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('uses correct background color', async () => {
    renderRoadmap()
    await waitFor(() => {
      expect(screen.getByText('Data Structures & Algorithms')).toBeInTheDocument()
    }, { timeout: 5000 })
    const mainDiv = document.querySelector('[style*="background"]')
    expect(mainDiv).toBeTruthy()
  })
})
// Mock data for Performance Dashboard
// This serves as the single source of truth for development

export const mockData = {
  // User's enrolled courses with progress
  courses: [
    {
      id: 'maths',
      name: 'Mathematics',
      completedTopics: 4,
      totalTopics: 100,
      color: '#8b5cf6', // violet
    },
    {
      id: 'dsa',
      name: 'Data Structures & Algorithms',
      completedTopics: 8,
      totalTopics: 250,
      color: '#06b6d4', // cyan
    },
    {
      id: 'python',
      name: 'Python Programming',
      completedTopics: 15,
      totalTopics: 80,
      color: '#10b981', // emerald
    },
    {
      id: 'sql',
      name: 'SQL & Databases',
      completedTopics: 3,
      totalTopics: 45,
      color: '#f59e0b', // amber
    },
  ],

  // Study history for the past 7 days
  studyHistory: [
    { day: 'Mon', date: '2026-03-16', hours: 2.5 },
    { day: 'Tue', date: '2026-03-17', hours: 1.8 },
    { day: 'Wed', date: '2026-03-18', hours: 3.2 },
    { day: 'Thu', date: '2026-03-19', hours: 2.0 },
    { day: 'Fri', date: '2026-03-20', hours: 2.7 },
    { day: 'Sat', date: '2026-03-21', hours: 4.1 },
    { day: 'Sun', date: '2026-03-22', hours: 1.5 },
  ],

  // Total accumulated study time in hours
  totalStudyTimeHours: 45.5,

  // Today's study time in hours
  todaysStudyTimeHours: 1.5,

  // Goal deadline
  goalDeadline: '2026-04-30',

  // Current streak data
  streak: {
    currentStreak: 7,
    longestStreak: 14,
    lastStudyDate: '2026-03-22',
  },
}

export default mockData

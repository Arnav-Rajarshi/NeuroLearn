// ─── NeuroLearn · Performance Dashboard · Mock Data ─────────────────────────
// Modules 1 & 2 are not yet implemented.
// Historical trend data is simulated on the frontend (see utils/metrics.js).

// Courses from Module 1
export const courses = [
  { name: "Maths", completedTopics: 4, totalTopics: 100 },
  { name: "DSA", completedTopics: 8, totalTopics: 250 },
]

// Questions stats
export const totalQuestionsAttempted = 85
export const totalQuestionsCorrect = 62

// Study time stats
export const totalStudyTimeHours = 4.5
export const todaysStudyTimeHours = 1.2

// Goal deadline
export const goalDeadline = "2026-04-30"

// Study streak
export const studyStreakDays = 4

// ─── Historical Progress Data (NEW) ─────────────────────────────────────────
// Simulates learning progress over time (like Screenshot 2)

export const progressHistory = [
  { week: "Week 1", completed: 1 },
  { week: "Week 2", completed: 3 },
  { week: "Week 3", completed: 2 },
  { week: "Week 4", completed: 4 },
  { week: "Week 5", completed: 6 },
  { week: "Week 6", completed: 8 },
  { week: "Week 7", completed: 7 },
  { week: "Week 8", completed: 10 },
  { week: "Week 9", completed: 11 },
  { week: "Week 10", completed: 8 },
  { week: "Week 11", completed: 12 },
]
const STORAGE_KEY = 'neurolearn_progress'

// Default progress structure
const defaultProgress = {
  courses: [],
  totalQuestionsAttempted: 0,
  totalCorrectAnswers: 0,
  roadmapProgress: 0,
  goalDeadline: '',
  user: {
    premium: false,
  },
  courseSettings: {}, // Store roadmap type, known topics, etc.
  completedSubtopics: {}, // Track completed subtopics per course
  attemptedQuestions: {}, // Track attempted questions
}

// Get progress data from localStorage
export function getProgress() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultProgress, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Failed to load progress from localStorage', error)
  }
  return { ...defaultProgress }
}

// Save progress data to localStorage
export function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('Failed to save progress to localStorage', error)
  }
}

// Get user premium status
export function isPremiumUser() {
  const progress = getProgress()
  return progress.user?.premium || false
}

// Set user premium status
export function setPremiumStatus(premium) {
  const progress = getProgress()
  progress.user = { ...progress.user, premium }
  saveProgress(progress)
}

// Get course progress
export function getCourseProgress(courseId) {
  const progress = getProgress()
  return progress.courses.find(c => c.name === courseId) || {
    name: courseId,
    completedTopics: 0,
    totalTopics: 0,
  }
}

// Update course progress
export function updateCourseProgress(courseId, completedTopics, totalTopics) {
  const progress = getProgress()
  const courseIndex = progress.courses.findIndex(c => c.name === courseId)
  
  const courseProgress = {
    name: courseId,
    completedTopics,
    totalTopics,
  }

  if (courseIndex >= 0) {
    progress.courses[courseIndex] = courseProgress
  } else {
    progress.courses.push(courseProgress)
  }

  // Update overall roadmap progress
  const totalCompleted = progress.courses.reduce((sum, c) => sum + c.completedTopics, 0)
  const totalAll = progress.courses.reduce((sum, c) => sum + c.totalTopics, 0)
  progress.roadmapProgress = totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0

  saveProgress(progress)
  return courseProgress
}

// Save course settings (roadmap type, known topics, etc.)
export function saveCourseSettings(courseId, settings) {
  const progress = getProgress()
  progress.courseSettings[courseId] = {
    ...progress.courseSettings[courseId],
    ...settings,
  }
  saveProgress(progress)
}

// Get course settings
export function getCourseSettings(courseId) {
  const progress = getProgress()
  return progress.courseSettings[courseId] || null
}

// Mark a subtopic as completed
export function markSubtopicCompleted(courseId, topicName, subtopicName) {
  const progress = getProgress()
  
  if (!progress.completedSubtopics[courseId]) {
    progress.completedSubtopics[courseId] = {}
  }
  if (!progress.completedSubtopics[courseId][topicName]) {
    progress.completedSubtopics[courseId][topicName] = []
  }
  
  if (!progress.completedSubtopics[courseId][topicName].includes(subtopicName)) {
    progress.completedSubtopics[courseId][topicName].push(subtopicName)
  }
  
  saveProgress(progress)
  return progress.completedSubtopics[courseId]
}

// Check if a subtopic is completed
export function isSubtopicCompleted(courseId, topicName, subtopicName) {
  const progress = getProgress()
  return progress.completedSubtopics[courseId]?.[topicName]?.includes(subtopicName) || false
}

// Get completed subtopics count for a topic
export function getCompletedSubtopicsCount(courseId, topicName) {
  const progress = getProgress()
  return progress.completedSubtopics[courseId]?.[topicName]?.length || 0
}

// Get total completed subtopics for a course
export function getTotalCompletedSubtopics(courseId) {
  const progress = getProgress()
  const courseSubtopics = progress.completedSubtopics[courseId] || {}
  return Object.values(courseSubtopics).reduce((total, subtopics) => total + subtopics.length, 0)
}

// Record a question attempt
export function recordQuestionAttempt(courseId, questionId, isCorrect) {
  const progress = getProgress()
  
  if (!progress.attemptedQuestions[courseId]) {
    progress.attemptedQuestions[courseId] = {}
  }
  
  // Only count first attempt
  if (!progress.attemptedQuestions[courseId][questionId]) {
    progress.attemptedQuestions[courseId][questionId] = {
      attempted: true,
      correct: isCorrect,
      attemptedAt: new Date().toISOString(),
    }
    progress.totalQuestionsAttempted++
    if (isCorrect) {
      progress.totalCorrectAnswers++
    }
  }
  
  saveProgress(progress)
  return progress
}

// Check if question was attempted
export function isQuestionAttempted(courseId, questionId) {
  const progress = getProgress()
  return progress.attemptedQuestions[courseId]?.[questionId]?.attempted || false
}

// Set goal deadline
export function setGoalDeadline(deadline) {
  const progress = getProgress()
  progress.goalDeadline = deadline
  saveProgress(progress)
}

// Get goal deadline
export function getGoalDeadline() {
  const progress = getProgress()
  return progress.goalDeadline
}

// Reset all progress (for testing)
export function resetProgress() {
  localStorage.removeItem(STORAGE_KEY)
}

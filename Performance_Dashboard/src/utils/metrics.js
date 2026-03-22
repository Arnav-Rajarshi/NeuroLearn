// Pure utility functions for dashboard metrics
// NO UI logic - only calculations

/**
 * Calculate overall progress across all courses
 * @param {Array} courses - Array of course objects with completedTopics and totalTopics
 * @returns {Object} { completed, total, percentage }
 */
export function getOverallProgress(courses) {
  if (!courses || courses.length === 0) {
    return { completed: 0, total: 0, percentage: 0 }
  }

  const completed = courses.reduce((sum, course) => sum + course.completedTopics, 0)
  const total = courses.reduce((sum, course) => sum + course.totalTopics, 0)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return { completed, total, percentage }
}

/**
 * Calculate learning speed (topics per hour)
 * @param {number} completedTopics - Total completed topics
 * @param {number} totalStudyTimeHours - Total study time in hours
 * @returns {number} Learning speed (topics/hour)
 */
export function getLearningSpeed(completedTopics, totalStudyTimeHours) {
  if (totalStudyTimeHours <= 0) return 0
  return completedTopics / totalStudyTimeHours
}

/**
 * Calculate average daily study time
 * @param {Array} studyHistory - Array of { day, hours } objects
 * @returns {number} Average hours per day
 */
export function getAverageDailyStudyTime(studyHistory) {
  if (!studyHistory || studyHistory.length === 0) return 0
  const totalHours = studyHistory.reduce((sum, day) => sum + day.hours, 0)
  return totalHours / studyHistory.length
}

/**
 * Calculate goal prediction and status
 * @param {Object} params
 * @param {Array} params.courses - Course data
 * @param {number} params.totalStudyTimeHours - Total study hours
 * @param {Array} params.studyHistory - Study history data
 * @param {string} params.goalDeadline - Deadline date string (YYYY-MM-DD)
 * @returns {Object} Prediction data
 */
export function getGoalPrediction({ courses, totalStudyTimeHours, studyHistory, goalDeadline }) {
  const { completed, total } = getOverallProgress(courses)
  const remainingTopics = total - completed

  // Handle edge cases
  if (remainingTopics <= 0) {
    return {
      predictedDate: new Date().toISOString().split('T')[0],
      deadlineDate: goalDeadline,
      daysNeeded: 0,
      daysUntilDeadline: getDaysUntil(goalDeadline),
      status: 'on_track',
      statusLabel: 'Completed',
      extraMinutesNeeded: 0,
      hoursNeeded: 0,
    }
  }

  const learningSpeed = getLearningSpeed(completed, totalStudyTimeHours)
  const avgDailyStudy = getAverageDailyStudyTime(studyHistory)

  // If no learning data yet, can't predict
  if (learningSpeed <= 0 || avgDailyStudy <= 0) {
    return {
      predictedDate: null,
      deadlineDate: goalDeadline,
      daysNeeded: null,
      daysUntilDeadline: getDaysUntil(goalDeadline),
      status: 'unknown',
      statusLabel: 'Not enough data',
      extraMinutesNeeded: 0,
      hoursNeeded: null,
    }
  }

  // Calculate predictions
  const hoursNeeded = remainingTopics / learningSpeed
  const daysNeeded = Math.ceil(hoursNeeded / avgDailyStudy)
  const daysUntilDeadline = getDaysUntil(goalDeadline)

  // Calculate predicted completion date
  const today = new Date()
  const predictedDate = new Date(today)
  predictedDate.setDate(predictedDate.getDate() + daysNeeded)
  const predictedDateStr = predictedDate.toISOString().split('T')[0]

  // Determine status
  let status, statusLabel
  const bufferDays = 3

  if (daysNeeded <= daysUntilDeadline) {
    status = 'on_track'
    statusLabel = 'On Track'
  } else if (daysNeeded <= daysUntilDeadline + bufferDays) {
    status = 'close'
    statusLabel: 'Close'
    statusLabel = 'Cutting it Close'
  } else {
    status = 'behind'
    statusLabel = 'Behind Schedule'
  }

  // Calculate extra minutes needed per day to meet deadline
  let extraMinutesNeeded = 0
  if (status === 'behind' || status === 'close') {
    const requiredDailyHours = hoursNeeded / daysUntilDeadline
    const extraHours = Math.max(0, requiredDailyHours - avgDailyStudy)
    extraMinutesNeeded = Math.ceil(extraHours * 60)
  }

  return {
    predictedDate: predictedDateStr,
    deadlineDate: goalDeadline,
    daysNeeded,
    daysUntilDeadline,
    status,
    statusLabel,
    extraMinutesNeeded,
    hoursNeeded: Math.round(hoursNeeded * 10) / 10,
  }
}

/**
 * Get days until a target date
 * @param {string} targetDate - Date string (YYYY-MM-DD)
 * @returns {number} Days until target
 */
export function getDaysUntil(targetDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const diffTime = target - today
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format a date string for display
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} Formatted date (e.g., "Apr 30, 2026")
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get streak status message
 * @param {number} streakDays - Current streak in days
 * @returns {string} Motivational message
 */
export function getStreakMessage(streakDays) {
  if (streakDays === 0) return "Start your learning journey today!"
  if (streakDays < 3) return "Great start! Keep the momentum going."
  if (streakDays < 7) return "You're building consistency. Keep going."
  if (streakDays < 14) return "Impressive dedication! One week strong."
  if (streakDays < 30) return "You're on fire! Two weeks of progress."
  return "Legendary commitment! Keep crushing it."
}

// ─── NeuroLearn · Performance Dashboard · Metrics Utilities ─────────────────

/**
 * Compute overall progress across all enrolled courses.
 */
export function computeOverallProgress(courses) {
  const totalCompleted = courses.reduce((sum, c) => sum + c.completedTopics, 0)
  const totalTopics = courses.reduce((sum, c) => sum + c.totalTopics, 0)

  return {
    totalCompleted,
    totalTopics,
    percentage: totalTopics > 0 ? (totalCompleted / totalTopics) * 100 : 0,
  }
}

/**
 * Compute learning speed: topics completed per study-hour.
 */
export function computeLearningSpeed(courses, totalStudyTimeHours) {
  const totalCompleted = courses.reduce((sum, c) => sum + c.completedTopics, 0)
  return totalStudyTimeHours > 0 ? totalCompleted / totalStudyTimeHours : 0
}

/**
 * Predict goal completion status.
 */
export function computeGoalPrediction(courses, totalStudyTimeHours, goalDeadline) {
  const totalCompleted = courses.reduce((sum, c) => sum + c.completedTopics, 0)
  const totalTopics = courses.reduce((sum, c) => sum + c.totalTopics, 0)

  const remainingTopics = totalTopics - totalCompleted

  const learningSpeed = computeLearningSpeed(courses, totalStudyTimeHours)

  const hoursNeeded =
    learningSpeed > 0 ? remainingTopics / learningSpeed : Infinity

  const TRACKED_DAYS = 30
  const avgDailyStudy = totalStudyTimeHours / TRACKED_DAYS

  const daysNeeded =
    avgDailyStudy > 0 ? hoursNeeded / avgDailyStudy : Infinity

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const predictedDate = new Date(today)
  predictedDate.setDate(today.getDate() + Math.ceil(daysNeeded))

  const deadline = new Date(goalDeadline)
  deadline.setHours(0, 0, 0, 0)

  const daysBuffer = Math.floor(
    (deadline - predictedDate) / (1000 * 60 * 60 * 24)
  )

  let status

  if (daysBuffer >= 7) status = "on_track"
  else if (daysBuffer >= 0) status = "close"
  else status = "behind"

  let extraMinutesPerDay = null

  if (status === "behind" && isFinite(hoursNeeded)) {
    const daysUntilDeadline = Math.floor(
      (deadline - today) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilDeadline > 0) {
      const requiredDailyHours = hoursNeeded / daysUntilDeadline
      const extraHours = requiredDailyHours - avgDailyStudy

      extraMinutesPerDay = Math.max(1, Math.ceil(extraHours * 60))
    }
  }

  return {
    predictedDate,
    deadline,
    status,
    daysNeeded: Math.ceil(daysNeeded),
    daysBuffer,
    extraMinutesPerDay,
    avgDailyStudy,
    hoursNeeded,
  }
}

/**
 * Generate progress trend using historical data
 */

export function generateProgressTrendData(courses, progressHistory) {

  const totalTopics = courses.reduce(
    (sum, c) => sum + c.totalTopics,
    0
  )

  const weeks = progressHistory.length
  const weeklyTarget = totalTopics / weeks

  let cumulativeProgress = 0

  return progressHistory.map((entry, index) => {

    cumulativeProgress += entry.completed

    const goalTopics = (index + 1) * weeklyTarget

    const goalPercent = (goalTopics / totalTopics) * 100
    const progressPercent = (cumulativeProgress / totalTopics) * 100

    return {
      label: entry.week,
      studentProgress: Number(progressPercent.toFixed(2)),
      goalProgress: Number(goalPercent.toFixed(2)),
    }

  })
}


/**
 * Generate compact velocity data
 */
export function generateCompactVelocityData(totalStudyTimeHours, todaysStudyTimeHours) {

  const PATTERN = [
    0.8, 1.1, 0.6, 1.3, 0.0, 1.5, 1.0,
    0.9, 1.2, 0.7, 1.4, 0.0, 1.1, 0.8,
    1.0, 1.3, 0.5, 1.5, 0.0, 1.2, todaysStudyTimeHours,
  ]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const N = PATTERN.length

  const rawData = PATTERN.map((hours, i) => {

    const date = new Date(today)
    date.setDate(today.getDate() - (N - 1 - i))

    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      hours,
    }

  })

  const SMA_WINDOW = 5

  return rawData.map((point, index) => {

    const window = rawData.slice(
      Math.max(0, index - SMA_WINDOW + 1),
      index + 1
    )

    const sma = window.reduce((sum, d) => sum + d.hours, 0) / window.length

    return {
      ...point,
      sma: Math.round(sma * 100) / 100,
    }

  })
}
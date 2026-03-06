// Course configuration with display names and file mappings
export const COURSES = {
  dsa: {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    shortName: 'DSA',
    description: 'Master fundamental data structures and algorithms',
    free: true,
    pnlFile: 'dsa_PNL.json',
    practiceFile: 'dsa_PRACTICE.json',
  },
  python: {
    id: 'python',
    name: 'Python Programming',
    shortName: 'Python',
    description: 'Learn Python from basics to advanced concepts',
    free: true,
    pnlFile: 'python_PNL.json',
    practiceFile: 'python_PRACTICE.json',
  },
  english: {
    id: 'english',
    name: 'English Proficiency',
    shortName: 'English',
    description: 'Improve your English language skills',
    free: true,
    pnlFile: 'english_PNL.json',
    practiceFile: 'english_PRACTICE.json',
  },
  sql: {
    id: 'sql',
    name: 'RDBMS & SQL',
    shortName: 'SQL',
    description: 'Master database management and SQL queries',
    free: true,
    pnlFile: 'SQL_PNL.json',
    practiceFile: 'sql_practice.json',
  },
  frontend: {
    id: 'frontend',
    name: 'HTML CSS JavaScript',
    shortName: 'Frontend',
    description: 'Build modern web applications from scratch',
    free: true,
    pnlFile: 'frontend_PNL.json',
    practiceFile: 'frontend_PRACTICE.json',
  },
  // Premium courses (locked by default)
  machinelearning: {
    id: 'machinelearning',
    name: 'Machine Learning',
    shortName: 'ML',
    description: 'Deep dive into machine learning algorithms',
    free: false,
    pnlFile: null,
    practiceFile: null,
  },
  systemdesign: {
    id: 'systemdesign',
    name: 'System Design',
    shortName: 'System Design',
    description: 'Learn to design scalable systems',
    free: false,
    pnlFile: null,
    practiceFile: null,
  },
  devops: {
    id: 'devops',
    name: 'DevOps & Cloud',
    shortName: 'DevOps',
    description: 'Master CI/CD and cloud infrastructure',
    free: false,
    pnlFile: null,
    practiceFile: null,
  },
}

// Get all courses as an array
export function getAllCourses() {
  return Object.values(COURSES)
}

// Get a specific course by ID
export function getCourseById(courseId) {
  return COURSES[courseId] || null
}

// Load course data dynamically based on roadmap type
export async function loadCourseData(courseId, roadmapType = 'pnl') {
  const course = getCourseById(courseId)
  if (!course) {
    throw new Error(`Course not found: ${courseId}`)
  }

  const fileName = roadmapType === 'practice' ? course.practiceFile : course.pnlFile
  if (!fileName) {
    throw new Error(`No data file available for course: ${courseId}`)
  }

  try {
    // Fetch JSON files from public/data/courses folder
    const response = await fetch(`/data/courses/${fileName}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to load course data: ${fileName}`, error)
    throw new Error(`Failed to load course data for ${courseId}`)
  }
}

// Extract all topic names from course data
export function getTopicNames(courseData) {
  if (!courseData || !courseData.topics) return []
  return courseData.topics.map(topic => topic.name)
}

// Get total subtopics count
export function getTotalSubtopics(courseData) {
  if (!courseData || !courseData.topics) return 0
  return courseData.topics.reduce((total, topic) => {
    return total + (topic.subtopics ? topic.subtopics.length : 0)
  }, 0)
}

// Get total practice questions count
export function getTotalPracticeQuestions(courseData) {
  if (!courseData || !courseData.topics) return 0
  return courseData.topics.reduce((total, topic) => {
    return total + (topic.subtopics || []).reduce((subTotal, subtopic) => {
      const practiceCount = subtopic.practice?.length || subtopic.questions?.length || 0
      return subTotal + practiceCount
    }, 0)
  }, 0)
}

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
  ai_fundamentals: {
    id: 'ai_fundamentals',
    name: 'AI Fundamentals',
    shortName: 'AI',
    description: 'Master the fundamentals of Artificial Intelligence',
    free: false,
    pnlFile: 'ai_fundamentals_PNL.json',
    practiceFile: 'ai_fundamentals_PRACTICE.json',
  },
  machine_learning: {
    id: 'machine_learning',
    name: 'Machine Learning',
    shortName: 'ML',
    description: 'Deep dive into machine learning algorithms',
    free: false,
    pnlFile: 'machine_learning_PNL.json',
    practiceFile: 'machine_learning_PRACTICE.json',
  },
  deep_learning: {
    id: 'deep_learning',
    name: 'Deep Learning',
    shortName: 'DL',
    description: 'Neural networks and deep learning architectures',
    free: false,
    pnlFile: 'deep_learning_PNL.json',
    practiceFile: 'deep_learning_PRACTICE.json',
  },
  system_design: {
    id: 'system_design',
    name: 'System Design',
    shortName: 'System Design',
    description: 'Learn to design scalable distributed systems',
    free: false,
    pnlFile: 'system_design_PNL.json',
    practiceFile: 'system_design_PRACTICE.json',
  },
  backend_engineering: {
    id: 'backend_engineering',
    name: 'Backend Engineering',
    shortName: 'Backend',
    description: 'Build robust backend systems and APIs',
    free: false,
    pnlFile: 'backend_engineering_PNL.json',
    practiceFile: 'backend_engineering_PRACTICE.json',
  },
  cloud_computing: {
    id: 'cloud_computing',
    name: 'Cloud Computing',
    shortName: 'Cloud',
    description: 'Master AWS, Azure, and cloud architecture',
    free: false,
    pnlFile: 'cloud_computing_PNL.json',
    practiceFile: 'cloud_computing_PRACTICE.json',
  },
  devops_engineering: {
    id: 'devops_engineering',
    name: 'DevOps Engineering',
    shortName: 'DevOps',
    description: 'CI/CD pipelines and infrastructure automation',
    free: false,
    pnlFile: 'devops_engineering_PNL.json',
    practiceFile: 'devops_engineering_PRACTICE.json',
  },
  cybersecurity_basics: {
    id: 'cybersecurity_basics',
    name: 'Cybersecurity Basics',
    shortName: 'Security',
    description: 'Network security and ethical hacking fundamentals',
    free: false,
    pnlFile: 'cybersecurity_basics_PNL.json',
    practiceFile: 'cybersecurity_basics_PRACTICE.json',
  },
  data_engineering: {
    id: 'data_engineering',
    name: 'Data Engineering',
    shortName: 'Data Eng',
    description: 'Build data pipelines and warehouses',
    free: false,
    pnlFile: 'data_engineering_PNL.json',
    practiceFile: 'data_engineering_PRACTICE.json',
  },
  distributed_systems: {
    id: 'distributed_systems',
    name: 'Distributed Systems',
    shortName: 'Distributed',
    description: 'CAP theorem, consensus, and microservices',
    free: false,
    pnlFile: 'distributed_systems_PNL.json',
    practiceFile: 'distributed_systems_PRACTICE.json',
  },
  react_advanced: {
    id: 'react_advanced',
    name: 'React Advanced',
    shortName: 'React Pro',
    description: 'Advanced React patterns and performance',
    free: false,
    pnlFile: 'react_advanced_PNL.json',
    practiceFile: 'react_advanced_PRACTICE.json',
  },
  nodejs_advanced: {
    id: 'nodejs_advanced',
    name: 'Node.js Advanced',
    shortName: 'Node Pro',
    description: 'Advanced Node.js patterns and security',
    free: false,
    pnlFile: 'nodejs_advanced_PNL.json',
    practiceFile: 'nodejs_advanced_PRACTICE.json',
  },
  blockchain_basics: {
    id: 'blockchain_basics',
    name: 'Blockchain Basics',
    shortName: 'Blockchain',
    description: 'Blockchain fundamentals and smart contracts',
    free: false,
    pnlFile: 'blockchain_basics_PNL.json',
    practiceFile: 'blockchain_basics_PRACTICE.json',
  },
  competitive_programming: {
    id: 'competitive_programming',
    name: 'Competitive Programming',
    shortName: 'CP',
    description: 'Advanced algorithms for competitive coding',
    free: false,
    pnlFile: 'competitive_programming_PNL.json',
    practiceFile: 'competitive_programming_PRACTICE.json',
  },
  software_architecture: {
    id: 'software_architecture',
    name: 'Software Architecture',
    shortName: 'Architecture',
    description: 'Design patterns and architectural principles',
    free: false,
    pnlFile: 'software_architecture_PNL.json',
    practiceFile: 'software_architecture_PRACTICE.json',
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

  const errorData = await response.json()

  console.error("Backend error payload:", errorData)

  let message = "API request failed"

  if (typeof errorData?.detail === "string") {
    message = errorData.detail
  } 
  else if (typeof errorData?.detail === "object") {
    message = JSON.stringify(errorData.detail)
  } 
  else if (errorData?.message) {
    message = errorData.message
  } 
  else {
    message = JSON.stringify(errorData)
  }

  throw new Error(message)
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

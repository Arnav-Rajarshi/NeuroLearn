// Course data utilities - fetches all course data from backend API
// NO HARDCODED COURSE DATA - backend is the single source of truth

import { fetchBackendCourses, getCourseById as getCourseByIdFromApi } from './api.js'

/**
 * Get all courses from backend
 * @returns {Promise<Array>} - Array of course objects with cid, course_name, is_premium, etc.
 */
export async function getAllCourses() {
  try {
    const courses = await fetchBackendCourses()
    // Transform backend courses to include expected properties
    return courses.map(course => ({
      cid: course.cid,
      id: course.cid, // Keep 'id' as alias for compatibility
      name: course.course_name,
      shortName: getShortName(course.course_name),
      description: course.description || `Master ${course.course_name}`,
      free: !course.is_premium,
      // File names are derived from course name for local JSON files
      pnlFile: `${course.course_name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '')}_PNL.json`,
      practiceFile: `${course.course_name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '')}_PRACTICE.json`,
    }))
  } catch (error) {
    console.error('Failed to fetch courses from backend:', error)
    return []
  }
}

/**
 * Get a specific course by CID from backend
 * @param {number} cid - The course cid (must be a number from backend)
 * @returns {Promise<object|null>} - Course object or null if not found
 */
export async function getCourseById(cid) {
  if (!cid && cid !== 0) {
    console.error('[v0] getCourseById: cid is required')
    return null
  }
  
  const numericCid = typeof cid === 'number' ? cid : parseInt(cid, 10)
  if (isNaN(numericCid)) {
    console.error('[v0] getCourseById: cid must be a number, got:', cid)
    return null
  }
  
  try {
    const course = await getCourseByIdFromApi(numericCid)
    if (!course) return null
    
    return {
      cid: course.cid,
      id: course.cid,
      name: course.course_name,
      shortName: getShortName(course.course_name),
      description: course.description || `Master ${course.course_name}`,
      free: !course.is_premium,
      pnlFile: `${course.course_name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '')}_PNL.json`,
      practiceFile: `${course.course_name.toLowerCase().replace(/\s+/g, '_').replace(/&/g, '')}_PRACTICE.json`,
    }
  } catch (error) {
    console.error('Failed to fetch course by cid:', cid, error)
    return null
  }
}

/**
 * Generate a short name from course name
 * @param {string} courseName - Full course name
 * @returns {string} - Short name
 */
function getShortName(courseName) {
  const shortNames = {
    'Data Structures & Algorithms': 'DSA',
    'Python Programming': 'Python',
    'English Proficiency': 'English',
    'RDBMS & SQL': 'SQL',
    'HTML CSS JavaScript': 'Frontend',
    'Machine Learning': 'ML',
    'Deep Learning': 'DL',
    'AI Fundamentals': 'AI',
    'System Design': 'System Design',
    'Backend Engineering': 'Backend',
    'Cloud Computing': 'Cloud',
    'DevOps Engineering': 'DevOps',
    'Cybersecurity Basics': 'Security',
    'Data Engineering': 'Data Eng',
    'Distributed Systems': 'Distributed',
    'React Advanced': 'React Pro',
    'Node.js Advanced': 'Node Pro',
    'Blockchain Basics': 'Blockchain',
    'Competitive Programming': 'CP',
    'Software Architecture': 'Architecture',
  }
  return shortNames[courseName] || courseName.split(' ')[0]
}

/**
 * Load course roadmap data from local JSON file
 * @param {number} cid - Course cid from backend
 * @param {string} roadmapType - 'pnl' or 'practice'
 * @returns {Promise<object>} - Course roadmap data
 */
export async function loadCourseData(cid, roadmapType = 'pnl') {
  const course = await getCourseById(cid)
  if (!course) {
    throw new Error(`Course not found for cid: ${cid}`)
  }

  const fileName = roadmapType === 'practice' ? course.practiceFile : course.pnlFile
  if (!fileName) {
    throw new Error(`No data file available for course cid: ${cid}`)
  }

  try {
    // Fetch JSON files from public/data/courses folder
    const response = await fetch(`/data/courses/${fileName}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Failed to load course data:", errorData)
      throw new Error(`Failed to load course data: ${fileName}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to load course data: ${fileName}`, error)
    throw new Error(`Failed to load course data for cid ${cid}`)
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

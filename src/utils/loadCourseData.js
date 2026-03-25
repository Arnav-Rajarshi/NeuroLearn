// Course data utilities - fetches all course data from backend API
// NO HARDCODED COURSE DATA - backend is the single source of truth
// NO LOCAL JSON FILES - all data comes from backend API

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
    return null
  }
  
  const numericCid = typeof cid === 'number' ? cid : parseInt(cid, 10)
  if (isNaN(numericCid)) {
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

// NOTE: loadCourseData function has been REMOVED
// All roadmap data should be fetched from the backend API using getRoadmap(cid)
// Do NOT use local JSON files

// Extract all topic names from roadmap data (from backend API response)
export function getTopicNames(roadmapData) {
  if (!roadmapData || !roadmapData.topics) return []
  return roadmapData.topics.map(topic => topic.name || topic.topic_name).filter(Boolean)
}

// Get total subtopics count from roadmap data
export function getTotalSubtopics(roadmapData) {
  if (!roadmapData || !roadmapData.topics) return 0
  return roadmapData.topics.reduce((total, topic) => {
    return total + (topic.subtopics ? topic.subtopics.length : 0)
  }, 0)
}

// Get total practice questions count from roadmap data
export function getTotalPracticeQuestions(roadmapData) {
  if (!roadmapData || !roadmapData.topics) return 0
  return roadmapData.topics.reduce((total, topic) => {
    return total + (topic.subtopics || []).reduce((subTotal, subtopic) => {
      const practiceCount = subtopic.practice?.length || subtopic.questions?.length || 0
      return subTotal + practiceCount
    }, 0)
  }, 0)
}

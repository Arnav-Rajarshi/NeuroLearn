// Central mapping of course slugs to database cid values
// This ensures frontend routing uses slugs while backend API calls use integer cids

export const COURSE_SLUG_TO_CID = {
  // Free courses
  dsa: 1,
  python: 2,
  english: 3,
  sql: 4,
  frontend: 5,
  // Premium courses
  machine_learning: 6,
  system_design: 7,
  ai_fundamentals: 8,
  software_architecture: 9,
  competitive_programming: 10,
  blockchain_basics: 11,
  nodejs_advanced: 12,
  deep_learning: 13,
  backend_engineering: 14,
  cloud_computing: 15,
  devops_engineering: 16,
  cybersecurity_basics: 17,
  data_engineering: 18,
  distributed_systems: 19,
  react_advanced: 20,
}

// Reverse mapping: cid → slug
export const COURSE_CID_TO_SLUG = Object.fromEntries(
  Object.entries(COURSE_SLUG_TO_CID).map(([slug, cid]) => [cid, slug])
)

/**
 * Convert a course slug to its database cid
 * @param {string} slug - The course slug (e.g., "python", "dsa")
 * @returns {number} - The database cid
 * @throws {Error} - If slug is unknown
 */
export function getCid(slug) {
  // If it's already a number, return it
  if (typeof slug === 'number') {
    return slug
  }
  
  // If it's a numeric string, parse and return
  const numericValue = parseInt(slug, 10)
  if (!isNaN(numericValue)) {
    return numericValue
  }
  
  // Look up the slug in the mapping
  const cid = COURSE_SLUG_TO_CID[slug]
  if (cid === undefined) {
    console.warn(`Unknown course slug: ${slug}, returning 0`)
    return 0
  }
  return cid
}

/**
 * Convert a database cid to its course slug
 * @param {number} cid - The database cid
 * @returns {string} - The course slug
 */
export function getSlug(cid) {
  return COURSE_CID_TO_SLUG[cid] ?? String(cid)
}

/**
 * Check if a value is a valid course slug
 * @param {string} slug - The value to check
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  return slug in COURSE_SLUG_TO_CID
}

/**
 * Check if a value is a valid course cid
 * @param {number} cid - The value to check
 * @returns {boolean}
 */
export function isValidCid(cid) {
  return cid in COURSE_CID_TO_SLUG
}

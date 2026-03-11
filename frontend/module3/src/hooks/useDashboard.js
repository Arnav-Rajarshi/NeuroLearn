// ─── NeuroLearn · Performance Dashboard · useDashboard Hook ──────────────────
import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardData, fetchUserCourses } from '../services/api';

// Default fallback data when API is unavailable
const DEFAULT_DATA = {
  courses: [
    { name: "Maths", completedTopics: 4, totalTopics: 100 },
    { name: "DSA", completedTopics: 8, totalTopics: 250 },
  ],
  studyStreakDays: 4,
  totalStudyTimeHours: 4.5,
  todaysStudyTimeHours: 1.2,
  goalDeadline: "2026-04-30",
  progressHistory: [
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
  ],
  velocityData: [],
  metrics: {
    streak: 4,
    weekly_velocity: 4.5,
    completed_topics: 12,
    remaining_topics: 338,
    total_topics: 350,
    goal_prediction: "2026-05-15",
    status: "on_track",
    days_needed: 75,
    days_buffer: 10,
    extra_minutes_per_day: null
  }
};

/**
 * Custom hook for fetching and managing dashboard data.
 * 
 * @param {string} uid - User ID
 * @param {string} cid - Course ID (optional, will fetch first enrolled course if not provided)
 * @returns {Object} Dashboard state and methods
 */
export function useDashboard(uid, cid = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(cid);
  const [allCourses, setAllCourses] = useState([]);

  // Fetch all courses for a user
  const loadCourses = useCallback(async () => {
    if (!uid) return;
    
    try {
      const result = await fetchUserCourses(uid);
      setAllCourses(result.courses || []);
      
      // Set first course as selected if none specified
      if (!selectedCourse && result.courses?.length > 0) {
        setSelectedCourse(result.courses[0].cid);
      }
    } catch (err) {
      console.warn('Could not fetch courses, using defaults:', err.message);
    }
  }, [uid, selectedCourse]);

  // Fetch dashboard data
  const loadDashboard = useCallback(async () => {
    if (!uid) {
      setData(DEFAULT_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If we have a course ID, fetch dashboard data
      const courseId = selectedCourse || cid;
      
      if (courseId) {
        const result = await fetchDashboardData(uid, courseId);
        setData(result);
      } else {
        // No course selected, use default data
        setData(DEFAULT_DATA);
      }
    } catch (err) {
      console.warn('API error, using fallback data:', err.message);
      setError(err.message);
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, [uid, selectedCourse, cid]);

  // Initial load
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh function
  const refresh = useCallback(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Select a different course
  const selectCourse = useCallback((courseId) => {
    setSelectedCourse(courseId);
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    allCourses,
    selectedCourse,
    selectCourse,
    isUsingFallback: error !== null
  };
}

export default useDashboard;

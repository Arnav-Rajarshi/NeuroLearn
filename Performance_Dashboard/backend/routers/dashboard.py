# ─── NeuroLearn · Performance Dashboard · Dashboard Router ────────────────────
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import json

from ..database import get_connection
from ..schemas import (
    ProgressResponse,
    MetricsResponse,
    DashboardDataResponse,
    CourseProgress,
    HealthResponse
)
from ..services.analytics import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API and database health."""
    try:
        async with get_connection() as conn:
            await conn.fetchval("SELECT 1")
        return HealthResponse(status="healthy", database="connected")
    except Exception as e:
        return HealthResponse(status="unhealthy", database=f"error: {str(e)}")


@router.get("/progress/{uid}/{cid}", response_model=ProgressResponse)
async def get_progress(uid: str, cid: str):
    """
    Get learning progress data for a user's course enrollment.
    
    Returns progress JSON from progress_level table along with
    computed metrics for dashboard visualization.
    """
    try:
        async with get_connection() as conn:
            # Get progress data from progress_level table
            progress_row = await conn.fetchrow(
                """
                SELECT progress_json 
                FROM progress_level 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            # Get course preferences for goal date
            prefs_row = await conn.fetchrow(
                """
                SELECT goal_date, hrs_per_week 
                FROM course_preferences 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            # Get course info
            course_row = await conn.fetchrow(
                """
                SELECT c.cid, c.name, 
                       (SELECT COUNT(*) FROM topics_to_be_shown t WHERE t.cid = c.cid) as total_topics
                FROM courses c 
                WHERE c.cid = $1
                """,
                cid
            )
            
            if not progress_row:
                raise HTTPException(
                    status_code=404, 
                    detail=f"No progress found for user {uid} in course {cid}"
                )
            
            # Parse progress JSON
            progress_json = progress_row["progress_json"]
            if isinstance(progress_json, str):
                progress_json = json.loads(progress_json)
            
            # Extract data
            daily = progress_json.get("daily", [])
            weekly = progress_json.get("weekly", [])
            completed_topics = progress_json.get("completed_topics", 0)
            total_topics = progress_json.get("total_topics", 100)
            
            # Calculate study hours
            total_hours, todays_hours = AnalyticsService.calculate_total_study_hours(
                daily,
                prefs_row["hrs_per_week"] if prefs_row else 10.0
            )
            
            # Build course progress
            course_name = course_row["name"] if course_row else "Course"
            courses = [
                CourseProgress(
                    name=course_name,
                    completedTopics=completed_topics,
                    totalTopics=total_topics
                )
            ]
            
            # Generate progress history for charts
            progress_history = AnalyticsService.generate_progress_history(
                weekly, total_topics
            )
            
            # Get goal deadline
            goal_deadline = "2026-04-30"  # Default
            if prefs_row and prefs_row["goal_date"]:
                goal_deadline = prefs_row["goal_date"].strftime("%Y-%m-%d")
            
            return ProgressResponse(
                courses=courses,
                daily=[{"date": d.get("date", ""), "completed": d.get("completed", 0)} for d in daily],
                weekly=[{"week": w.get("week", 0), "topics": w.get("topics", 0)} for w in weekly],
                progressHistory=progress_history,
                totalStudyTimeHours=total_hours,
                todaysStudyTimeHours=todays_hours,
                goalDeadline=goal_deadline
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/metrics/{uid}/{cid}", response_model=MetricsResponse)
async def get_metrics(uid: str, cid: str):
    """
    Compute and return learning metrics for dashboard.
    
    Returns:
    - streak: continuous learning days
    - weekly_velocity: topics per week
    - completed_topics: total completed
    - remaining_topics: topics left
    - goal_prediction: estimated completion date
    """
    try:
        async with get_connection() as conn:
            # Get progress data
            progress_row = await conn.fetchrow(
                """
                SELECT progress_json 
                FROM progress_level 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            # Get course preferences
            prefs_row = await conn.fetchrow(
                """
                SELECT goal_date, hrs_per_week 
                FROM course_preferences 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            if not progress_row:
                raise HTTPException(
                    status_code=404,
                    detail=f"No progress found for user {uid} in course {cid}"
                )
            
            # Parse progress JSON
            progress_json = progress_row["progress_json"]
            if isinstance(progress_json, str):
                progress_json = json.loads(progress_json)
            
            daily = progress_json.get("daily", [])
            weekly = progress_json.get("weekly", [])
            completed_topics = progress_json.get("completed_topics", 0)
            total_topics = progress_json.get("total_topics", 100)
            velocity = progress_json.get("velocity", 0.0)
            
            # Compute streak
            streak = AnalyticsService.compute_streak(daily)
            
            # Compute weekly velocity
            weekly_velocity = AnalyticsService.compute_weekly_velocity(weekly)
            if weekly_velocity == 0 and velocity > 0:
                weekly_velocity = velocity
            
            # Compute goal prediction
            goal_date = None
            hrs_per_week = 10.0
            if prefs_row:
                if prefs_row["goal_date"]:
                    goal_date = prefs_row["goal_date"].strftime("%Y-%m-%d")
                if prefs_row["hrs_per_week"]:
                    hrs_per_week = float(prefs_row["hrs_per_week"])
            
            prediction = AnalyticsService.compute_goal_prediction(
                completed_topics,
                total_topics,
                weekly_velocity,
                goal_date,
                hrs_per_week
            )
            
            return MetricsResponse(
                streak=streak,
                weekly_velocity=weekly_velocity,
                completed_topics=completed_topics,
                remaining_topics=total_topics - completed_topics,
                total_topics=total_topics,
                goal_prediction=prediction["predicted_date"],
                status=prediction["status"],
                days_needed=prediction["days_needed"],
                days_buffer=prediction["days_buffer"],
                extra_minutes_per_day=prediction["extra_minutes_per_day"]
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/all/{uid}/{cid}", response_model=DashboardDataResponse)
async def get_all_dashboard_data(uid: str, cid: str):
    """
    Get all dashboard data in a single request.
    
    Combines progress and metrics for efficient frontend loading.
    """
    try:
        async with get_connection() as conn:
            # Get progress data
            progress_row = await conn.fetchrow(
                """
                SELECT progress_json 
                FROM progress_level 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            # Get course preferences
            prefs_row = await conn.fetchrow(
                """
                SELECT goal_date, hrs_per_week 
                FROM course_preferences 
                WHERE uid = $1 AND cid = $2
                """,
                uid, cid
            )
            
            # Get course info
            course_row = await conn.fetchrow(
                """
                SELECT cid, name FROM courses WHERE cid = $1
                """,
                cid
            )
            
            if not progress_row:
                raise HTTPException(
                    status_code=404,
                    detail=f"No progress found for user {uid} in course {cid}"
                )
            
            # Parse progress JSON
            progress_json = progress_row["progress_json"]
            if isinstance(progress_json, str):
                progress_json = json.loads(progress_json)
            
            daily = progress_json.get("daily", [])
            weekly = progress_json.get("weekly", [])
            completed_topics = progress_json.get("completed_topics", 0)
            total_topics = progress_json.get("total_topics", 100)
            velocity = progress_json.get("velocity", 0.0)
            
            # Calculate study hours
            hrs_per_week = prefs_row["hrs_per_week"] if prefs_row and prefs_row["hrs_per_week"] else 10.0
            total_hours, todays_hours = AnalyticsService.calculate_total_study_hours(
                daily, hrs_per_week
            )
            
            # Build course progress
            course_name = course_row["name"] if course_row else "Course"
            courses = [
                CourseProgress(
                    name=course_name,
                    completedTopics=completed_topics,
                    totalTopics=total_topics
                )
            ]
            
            # Compute metrics
            streak = AnalyticsService.compute_streak(daily)
            weekly_velocity = AnalyticsService.compute_weekly_velocity(weekly)
            if weekly_velocity == 0 and velocity > 0:
                weekly_velocity = velocity
            
            # Goal prediction
            goal_date = None
            if prefs_row and prefs_row["goal_date"]:
                goal_date = prefs_row["goal_date"].strftime("%Y-%m-%d")
            else:
                goal_date = "2026-04-30"
            
            prediction = AnalyticsService.compute_goal_prediction(
                completed_topics,
                total_topics,
                weekly_velocity,
                goal_date,
                hrs_per_week
            )
            
            # Generate chart data
            progress_history = AnalyticsService.generate_progress_history(
                weekly, total_topics
            )
            velocity_data = AnalyticsService.generate_velocity_data(
                daily, total_hours, todays_hours
            )
            
            metrics = MetricsResponse(
                streak=streak,
                weekly_velocity=weekly_velocity,
                completed_topics=completed_topics,
                remaining_topics=total_topics - completed_topics,
                total_topics=total_topics,
                goal_prediction=prediction["predicted_date"],
                status=prediction["status"],
                days_needed=prediction["days_needed"],
                days_buffer=prediction["days_buffer"],
                extra_minutes_per_day=prediction["extra_minutes_per_day"]
            )
            
            return DashboardDataResponse(
                courses=courses,
                studyStreakDays=streak,
                totalStudyTimeHours=total_hours,
                todaysStudyTimeHours=todays_hours,
                goalDeadline=goal_date,
                progressHistory=progress_history,
                velocityData=velocity_data,
                metrics=metrics
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/user/{uid}/courses")
async def get_user_courses(uid: str):
    """Get all courses enrolled by a user with their progress."""
    try:
        async with get_connection() as conn:
            # Get enrolled courses with progress
            rows = await conn.fetch(
                """
                SELECT 
                    c.cid,
                    c.name,
                    p.progress_json
                FROM courses_enrolled ce
                JOIN courses c ON ce.cid = c.cid
                LEFT JOIN progress_level p ON p.uid = ce.uid AND p.cid = ce.cid
                WHERE ce.uid = $1
                """,
                uid
            )
            
            courses = []
            for row in rows:
                progress_json = row["progress_json"]
                if progress_json:
                    if isinstance(progress_json, str):
                        progress_json = json.loads(progress_json)
                    completed = progress_json.get("completed_topics", 0)
                    total = progress_json.get("total_topics", 100)
                else:
                    completed = 0
                    total = 100
                
                courses.append({
                    "cid": row["cid"],
                    "name": row["name"],
                    "completedTopics": completed,
                    "totalTopics": total
                })
            
            return {"courses": courses}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

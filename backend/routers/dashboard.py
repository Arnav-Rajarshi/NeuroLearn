# ─── NeuroLearn · Performance Dashboard · Dashboard Router ────────────────────
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
import json

from database import get_db
from models.roadmap_models import ProgressLevel, CoursePreference, Course, CourseEnrolled
from schemas.roadmap_schema import (
    ProgressResponse,
    MetricsResponse,
    DashboardDataResponse,
    CourseProgress,
    HealthResponse
)
from services.analytics import AnalyticsService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/health", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Check API and database health."""
    try:
        # Try a simple query to test the connection
        db.execute("SELECT 1")
        return HealthResponse(status="healthy", database="connected")
    except Exception as e:
        return HealthResponse(status="unhealthy", database=f"error: {str(e)}")


@router.get("/progress/{uid}/{cid}", response_model=ProgressResponse)
def get_progress(uid: int, cid: int, db: Session = Depends(get_db)):
    """
    Get learning progress data for a user's course enrollment.
    
    Returns progress JSON from progress_level table along with
    computed metrics for dashboard visualization.
    """
    try:
        # Get progress data from progress_level table
        progress = db.query(ProgressLevel).filter(
            ProgressLevel.uid == uid,
            ProgressLevel.cid == cid
        ).first()
        
        # Get course preferences for goal date
        prefs = db.query(CoursePreference).filter(
            CoursePreference.uid == uid,
            CoursePreference.cid == cid
        ).first()
        
        # Get course info
        course = db.query(Course).filter(Course.cid == cid).first()
        
        if not progress:
            raise HTTPException(
                status_code=404, 
                detail=f"No progress found for user {uid} in course {cid}"
            )
        
        # Parse progress JSON
        progress_json = progress.progress_json
        if isinstance(progress_json, str):
            progress_json = json.loads(progress_json)
        
        if not progress_json:
            progress_json = {}
        
        # Extract data
        daily = progress_json.get("daily", [])
        weekly = progress_json.get("weekly", [])
        completed_topics = progress_json.get("completed_topics", 0)
        total_topics = progress_json.get("total_topics", 100)
        
        # Calculate study hours
        hrs_per_week = prefs.hrs_per_week if prefs else 10.0
        total_hours, todays_hours = AnalyticsService.calculate_total_study_hours(
            daily,
            hrs_per_week
        )
        
        # Build course progress
        course_name = course.course_name if course else "Course"
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
        if prefs and prefs.goal_date:
            goal_deadline = prefs.goal_date.strftime("%Y-%m-%d")
        
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
def get_metrics(uid: int, cid: int, db: Session = Depends(get_db)):
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
        # Get progress data
        progress = db.query(ProgressLevel).filter(
            ProgressLevel.uid == uid,
            ProgressLevel.cid == cid
        ).first()
        
        # Get course preferences
        prefs = db.query(CoursePreference).filter(
            CoursePreference.uid == uid,
            CoursePreference.cid == cid
        ).first()
        
        if not progress:
            raise HTTPException(
                status_code=404,
                detail=f"No progress found for user {uid} in course {cid}"
            )
        
        # Parse progress JSON
        progress_json = progress.progress_json
        if isinstance(progress_json, str):
            progress_json = json.loads(progress_json)
        
        if not progress_json:
            progress_json = {}
        
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
        if prefs:
            if prefs.goal_date:
                goal_date = prefs.goal_date.strftime("%Y-%m-%d")
            if prefs.hrs_per_week:
                hrs_per_week = float(prefs.hrs_per_week)
        
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
def get_all_dashboard_data(uid: int, cid: int, db: Session = Depends(get_db)):
    """
    Get all dashboard data in a single request.
    
    Combines progress and metrics for efficient frontend loading.
    """
    try:
        # Get progress data
        progress = db.query(ProgressLevel).filter(
            ProgressLevel.uid == uid,
            ProgressLevel.cid == cid
        ).first()
        
        # Get course preferences
        prefs = db.query(CoursePreference).filter(
            CoursePreference.uid == uid,
            CoursePreference.cid == cid
        ).first()
        
        # Get course info
        course = db.query(Course).filter(Course.cid == cid).first()
        
        if not progress:
            raise HTTPException(
                status_code=404,
                detail=f"No progress found for user {uid} in course {cid}"
            )
        
        # Parse progress JSON
        progress_json = progress.progress_json
        if isinstance(progress_json, str):
            progress_json = json.loads(progress_json)
        
        if not progress_json:
            progress_json = {}
        
        daily = progress_json.get("daily", [])
        weekly = progress_json.get("weekly", [])
        completed_topics = progress_json.get("completed_topics", 0)
        total_topics = progress_json.get("total_topics", 100)
        velocity = progress_json.get("velocity", 0.0)
        
        # Calculate study hours
        hrs_per_week = prefs.hrs_per_week if prefs and prefs.hrs_per_week else 10.0
        total_hours, todays_hours = AnalyticsService.calculate_total_study_hours(
            daily, hrs_per_week
        )
        
        # Build course progress
        course_name = course.course_name if course else "Course"
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
        if prefs and prefs.goal_date:
            goal_date = prefs.goal_date.strftime("%Y-%m-%d")
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
def get_user_courses(uid: int, db: Session = Depends(get_db)):
    """Get all courses enrolled by a user with their progress."""
    try:
        # Get enrolled courses with progress
        enrollments = db.query(CourseEnrolled).filter(
            CourseEnrolled.uid == uid
        ).all()
        
        courses = []
        for enrollment in enrollments:
            course = db.query(Course).filter(Course.cid == enrollment.cid).first()
            progress = db.query(ProgressLevel).filter(
                ProgressLevel.uid == uid,
                ProgressLevel.cid == enrollment.cid
            ).first()
            
            if course:
                progress_json = {}
                if progress and progress.progress_json:
                    progress_json = progress.progress_json
                    if isinstance(progress_json, str):
                        progress_json = json.loads(progress_json)
                
                completed = progress_json.get("completed_topics", 0)
                total = progress_json.get("total_topics", 100)
                
                courses.append({
                    "cid": course.cid,
                    "name": course.course_name,
                    "completedTopics": completed,
                    "totalTopics": total
                })
        
        return {"courses": courses}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

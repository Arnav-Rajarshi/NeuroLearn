# ─── NeuroLearn · Performance Dashboard · API Schemas ─────────────────────────
from pydantic import BaseModel
from typing import List, Optional
from datetime import date


# ─── Request Schemas ──────────────────────────────────────────────────────────

class ProgressRequest(BaseModel):
    """Request for progress data."""
    uid: int
    cid: int


# ─── Response Schemas ─────────────────────────────────────────────────────────

class CourseProgress(BaseModel):
    """Progress for a single course."""
    name: str
    completedTopics: int
    totalTopics: int


class DailyProgressEntry(BaseModel):
    """Daily progress entry for trend data."""
    date: str
    completed: int


class WeeklyProgressEntry(BaseModel):
    """Weekly progress entry for charts."""
    week: int
    topics: int


class ProgressResponse(BaseModel):
    """Response for GET /dashboard/progress/{uid}/{cid}"""
    courses: List[CourseProgress]
    daily: List[DailyProgressEntry]
    weekly: List[WeeklyProgressEntry]
    progressHistory: List[dict]  # For ProgressTrendGraph
    totalStudyTimeHours: float
    todaysStudyTimeHours: float
    goalDeadline: str


class MetricsResponse(BaseModel):
    """Response for GET /dashboard/metrics/{uid}/{cid}"""
    streak: int
    weekly_velocity: float
    completed_topics: int
    remaining_topics: int
    total_topics: int
    goal_prediction: str
    status: str  # "on_track", "close", "behind"
    days_needed: int
    days_buffer: int
    extra_minutes_per_day: Optional[int] = None


class DashboardDataResponse(BaseModel):
    """Combined response for all dashboard data."""
    # Course data
    courses: List[CourseProgress]
    
    # Streak
    studyStreakDays: int
    
    # Study time
    totalStudyTimeHours: float
    todaysStudyTimeHours: float
    
    # Goal
    goalDeadline: str
    
    # Progress history for ProgressTrendGraph
    progressHistory: List[dict]
    
    # Velocity data for CompactVelocityChart
    velocityData: List[dict]
    
    # Metrics
    metrics: MetricsResponse


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    database: str

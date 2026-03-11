# ─── NeuroLearn · Performance Dashboard · Database Models ─────────────────────
# Note: These are Pydantic models representing database tables
# The actual database schema already exists and MUST NOT be changed

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime


class User(BaseModel):
    """Represents a user in the system."""
    uid: int
    email: Optional[str] = None
    name: Optional[str] = None


class Course(BaseModel):
    """Represents a course."""
    cid: int
    name: str
    total_topics: int


class CourseEnrolled(BaseModel):
    """Represents a user's enrollment in a course."""
    uid: int
    cid: int
    enrolled_at: Optional[datetime] = None


class ProgressLevel(BaseModel):
    """Represents user's progress in a course."""
    uid: int
    cid: int
    progress_json: dict  # JSON containing progress data


class TopicsToBeShown(BaseModel):
    """Represents topics for a course."""
    cid: int
    topics_json: dict  # JSON containing topic structure


class CoursePreferences(BaseModel):
    """Represents user's course preferences and goals."""
    uid: int
    cid: int
    goal_date: Optional[date] = None
    hrs_per_week: Optional[float] = None


# ─── Progress JSON Schema ─────────────────────────────────────────────────────
# Expected structure of progress_json in progress_level table:
#
# {
#   "daily": [
#     {"date": "2026-03-01", "completed": 3},
#     {"date": "2026-03-02", "completed": 2}
#   ],
#   "weekly": [
#     {"week": 1, "topics": 5},
#     {"week": 2, "topics": 7}
#   ],
#   "velocity": 4.5,
#   "completed_topics": 35,
#   "total_topics": 120
# }


class DailyProgress(BaseModel):
    """Daily progress entry."""
    date: str
    completed: int


class WeeklyProgress(BaseModel):
    """Weekly progress entry."""
    week: int
    topics: int


class ProgressJSON(BaseModel):
    """Structure of progress_json field."""
    daily: List[DailyProgress] = []
    weekly: List[WeeklyProgress] = []
    velocity: float = 0.0
    completed_topics: int = 0
    total_topics: int = 0

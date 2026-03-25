"""
Courses Module - Course preferences and enrollment management

CRITICAL FIXES APPLIED:
1. Proper top_id handling with computed values
2. Proper DB commit and refresh
3. Logging for all operations
4. Consistent response format
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# LOGGING: Use centralized debug logger
from logger import get_logger
logger = get_logger(__name__)

from database import get_db
from models import User, Course, CoursePreference, Roadmap, CourseEnrolled, TopicsToBeShown
from auth import get_current_user

router = APIRouter(prefix="/courses", tags=["Courses"])


# ============ Pydantic Schemas ============

class CoursePreferenceCreate(BaseModel):
    cid: int
    lm: str  # 'PNL' or 'PRACTICE'
    goal_date: Optional[date] = None
    hrs_per_week: Optional[int] = None


class CoursePreferenceResponse(BaseModel):
    pref_id: int
    uid: int
    cid: int
    lm: Optional[str]
    goal_date: Optional[date]
    hrs_per_week: Optional[int]
    # ADDED: Enhanced response
    success: bool = True

    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    cid: int
    course_name: str

    class Config:
        from_attributes = True


# ============ API Endpoints ============

@router.get("/", response_model=List[CourseResponse])
def get_all_courses(db: Session = Depends(get_db)):
    """Get all available courses."""
    logger.info("[COURSES] GET / - Fetching all courses")
    courses = db.query(Course).all()
    logger.info(f"[COURSES] Found {len(courses)} courses")
    return courses


@router.get("/preferences/{cid}", response_model=CoursePreferenceResponse)
def get_course_preferences(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences for a specific course."""
    logger.info(f"[COURSES] GET /preferences/{cid} called by user={current_user.uid}")
    
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == current_user.uid,
        CoursePreference.cid == cid
    ).first()

    if not pref:
        logger.info(f"[COURSES] No preferences found for user={current_user.uid}, course={cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No preferences found for this course"
        )

    logger.info(f"[COURSES] Found preferences: lm={pref.lm}")
    return pref


@router.post("/preferences", response_model=CoursePreferenceResponse)
def save_course_preferences(
    pref_data: CoursePreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save or update user preferences for a course.
    
    FIXES APPLIED:
    1. Properly computes top_id instead of using stale value
    2. Proper DB commit and refresh
    3. Logging for debugging
    """
    logger.info(f"[COURSES] POST /preferences called by user={current_user.uid}, cid={pref_data.cid}, lm={pref_data.lm}")

    # Verify course exists
    course = db.query(Course).filter(Course.cid == pref_data.cid).first()
    if not course:
        logger.error(f"[COURSES] Course not found: {pref_data.cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # Find or create roadmap
    roadmap = db.query(Roadmap).filter(
        Roadmap.cid == pref_data.cid,
        Roadmap.lm == pref_data.lm
    ).first()

    if not roadmap:
        logger.info(f"[COURSES] Creating new roadmap for cid={pref_data.cid}, lm={pref_data.lm}")
        roadmap = Roadmap(
            cid=pref_data.cid,
            lm=pref_data.lm
        )
        db.add(roadmap)
        db.flush()

    # Check for existing preference
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == current_user.uid,
        CoursePreference.cid == pref_data.cid
    ).first()

    # FIX: Get top_id from topics_to_be_shown if it exists
    # This ensures we use a computed value, not a stale one
    topics_record = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.uid == current_user.uid,
        TopicsToBeShown.rid == roadmap.rid
    ).first()

    # FIX: Use computed top_id from topics_record if available
    top_id = topics_record.top_id if topics_record else None
    logger.info(f"[COURSES] Computed top_id={top_id} from topics_to_be_shown")

    if pref:
        # UPDATE existing preference
        logger.info(f"[COURSES] Updating existing preference pref_id={pref.pref_id}")
        pref.rid = roadmap.rid
        pref.lm = pref_data.lm
        pref.goal_date = pref_data.goal_date
        pref.hrs_per_week = pref_data.hrs_per_week
        pref.top_id = top_id
    else:
        # CREATE new preference
        logger.info(f"[COURSES] Creating new preference for user={current_user.uid}, course={pref_data.cid}")
        pref = CoursePreference(
            uid=current_user.uid,
            cid=pref_data.cid,
            rid=roadmap.rid,
            lm=pref_data.lm,
            goal_date=pref_data.goal_date,
            hrs_per_week=pref_data.hrs_per_week,
            top_id=top_id
        )
        db.add(pref)

    # Ensure enrollment
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == pref_data.cid
    ).first()

    if not enrollment:
        logger.info(f"[COURSES] Auto-enrolling user={current_user.uid} in course={pref_data.cid}")
        enrollment = CourseEnrolled(
            uid=current_user.uid,
            cid=pref_data.cid
        )
        db.add(enrollment)

    # FIX: Ensure DB persistence
    db.commit()
    db.refresh(pref)
    logger.info(f"[COURSES] Preferences saved and committed: pref_id={pref.pref_id}")

    return pref


@router.get("/enrolled", response_model=List[CourseResponse])
def get_enrolled_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all courses the user is enrolled in."""
    logger.info(f"[COURSES] GET /enrolled called by user={current_user.uid}")
    
    enrollments = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid
    ).all()

    courses = []
    for enrollment in enrollments:
        course = db.query(Course).filter(Course.cid == enrollment.cid).first()
        if course:
            courses.append(course)

    logger.info(f"[COURSES] Found {len(courses)} enrolled courses for user={current_user.uid}")
    return courses


@router.post("/enroll/{cid}")
def enroll_in_course(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Enroll user in a course.
    
    FIX: Proper logging and response format.
    """
    logger.info(f"[COURSES] POST /enroll/{cid} called by user={current_user.uid}")
    
    course = db.query(Course).filter(Course.cid == cid).first()
    if not course:
        logger.error(f"[COURSES] Course not found: {cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    existing = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == cid
    ).first()

    if existing:
        logger.info(f"[COURSES] User={current_user.uid} already enrolled in course={cid}")
        return {
            "success": True,
            "message": "Already enrolled in this course",
            "cid": cid
        }

    enrollment = CourseEnrolled(
        uid=current_user.uid,
        cid=cid
    )
    db.add(enrollment)
    db.commit()
    
    logger.info(f"[COURSES] User={current_user.uid} enrolled in course={cid}")

    return {
        "success": True,
        "message": "Successfully enrolled in course", 
        "cid": cid
    }


@router.delete("/enroll/{cid}")
def unenroll_from_course(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Unenroll user from a course.
    
    Note: This does NOT delete progress data.
    """
    logger.info(f"[COURSES] DELETE /enroll/{cid} called by user={current_user.uid}")
    
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == cid
    ).first()

    if not enrollment:
        logger.info(f"[COURSES] User={current_user.uid} not enrolled in course={cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not enrolled in this course"
        )

    db.delete(enrollment)
    db.commit()
    
    logger.info(f"[COURSES] User={current_user.uid} unenrolled from course={cid}")

    return {
        "success": True,
        "message": "Successfully unenrolled from course",
        "cid": cid
    }

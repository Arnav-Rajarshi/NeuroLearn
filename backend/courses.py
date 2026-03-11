from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

from database import get_db
from NeuroLearn.backend.models.models import User, Course, CoursePreference, Roadmap, CourseEnrolled
from NeuroLearn.backend.core.auth import get_current_user

router = APIRouter(prefix="/courses", tags=["Courses"])


# Pydantic schemas
class CoursePreferenceCreate(BaseModel):
    cid: int
    lm: str  # 'PNL' or 'PRACTICE'
    goal_date: Optional[date] = None
    hrs_per_week: Optional[int] = None
    known_topics: Optional[List[str]] = None


class CoursePreferenceResponse(BaseModel):
    pref_id: int
    uid: int
    cid: int
    lm: Optional[str]
    goal_date: Optional[date]
    hrs_per_week: Optional[int]

    class Config:
        from_attributes = True


class CourseResponse(BaseModel):
    cid: int
    course_name: str

    class Config:
        from_attributes = True


# Endpoints
@router.get("/", response_model=List[CourseResponse])
def get_all_courses(db: Session = Depends(get_db)):
    """Get all available courses"""
    courses = db.query(Course).all()
    return courses


@router.get("/preferences/{cid}", response_model=CoursePreferenceResponse)
def get_course_preferences(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user preferences for a specific course"""
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == current_user.uid,
        CoursePreference.cid == cid
    ).first()
    
    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No preferences found for this course"
        )
    
    return pref


@router.post("/preferences", response_model=CoursePreferenceResponse)
def save_course_preferences(
    pref_data: CoursePreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update user preferences for a course"""
    # Verify course exists
    course = db.query(Course).filter(Course.cid == pref_data.cid).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Find or create roadmap for this course and learning mode
    roadmap = db.query(Roadmap).filter(
        Roadmap.cid == pref_data.cid,
        Roadmap.lm == pref_data.lm
    ).first()
    
    if not roadmap:
        # Create roadmap if it doesn't exist
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
    
    if pref:
        # Update existing preference
        pref.rid = roadmap.rid
        pref.lm = pref_data.lm
        pref.goal_date = pref_data.goal_date
        pref.hrs_per_week = pref_data.hrs_per_week
    else:
        # Create new preference
        pref = CoursePreference(
            uid=current_user.uid,
            cid=pref_data.cid,
            rid=roadmap.rid,
            lm=pref_data.lm,
            goal_date=pref_data.goal_date,
            hrs_per_week=pref_data.hrs_per_week
        )
        db.add(pref)
    
    # Ensure user is enrolled in the course
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == pref_data.cid
    ).first()
    
    if not enrollment:
        enrollment = CourseEnrolled(
            uid=current_user.uid,
            cid=pref_data.cid
        )
        db.add(enrollment)
    
    db.commit()
    db.refresh(pref)
    
    return pref


@router.get("/enrolled", response_model=List[CourseResponse])
def get_enrolled_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all courses the user is enrolled in"""
    enrollments = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid
    ).all()
    
    courses = []
    for enrollment in enrollments:
        course = db.query(Course).filter(Course.cid == enrollment.cid).first()
        if course:
            courses.append(course)
    
    return courses


@router.post("/enroll/{cid}")
def enroll_in_course(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll user in a course"""
    # Verify course exists
    course = db.query(Course).filter(Course.cid == cid).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if already enrolled
    existing = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == cid
    ).first()
    
    if existing:
        return {"message": "Already enrolled in this course"}
    
    enrollment = CourseEnrolled(
        uid=current_user.uid,
        cid=cid
    )
    db.add(enrollment)
    db.commit()
    
    return {"message": "Successfully enrolled in course", "cid": cid}

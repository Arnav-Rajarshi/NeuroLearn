from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
<<<<<<< HEAD
from typing import List, Optional, Dict, Any
=======
from typing import List, Dict ,Any ,Optional 
>>>>>>> Module-RoadmapEngine
from datetime import datetime

from database import get_db
from models import User, ProgressLevel, Course, CourseEnrolled
from auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


# Pydantic schemas
class ProgressUpdate(BaseModel):
<<<<<<< HEAD
    course_name: str
    progress_json: Optional[Dict[str, Any]] = {}
    
=======
    cid: int
    top_id: Optional[int] = None
    progress_json: Optional[Dict[str, Any]] = {}

>>>>>>> Module-RoadmapEngine

class ProgressResponse(BaseModel):
    progress_id: int
    uid: int
    cid: int
<<<<<<< HEAD
    course_name: str
=======
    top_id: Optional[int]
>>>>>>> Module-RoadmapEngine
    progress_json: Dict[str, Any]
    last_updated: datetime

    class Config:
        from_attributes = True


class AllProgressResponse(BaseModel):
    progress: List[ProgressResponse]
    total_courses: int


# Endpoints
@router.post("/update", response_model=ProgressResponse)
def update_progress(
    progress_data: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the course by name
    course = db.query(Course).filter(
        Course.course_name == progress_data.course_name
    ).first()
    
    if not course:
        # Create course if it doesn't exist
        course = Course(course_name=progress_data.course_name)
        db.add(course)
        db.commit()
        db.refresh(course)
    
    # Ensure user is enrolled
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == course.cid
    ).first()
    
    if not enrollment:
        enrollment = CourseEnrolled(
            uid=current_user.uid,
            cid=course.cid
        )
        db.add(enrollment)
        db.commit()
    
    # Find existing progress for this course
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == course.cid
    ).first()
    
    if progress:
        # Update existing progress
        progress.progress_json = progress_data.progress_json
        progress.last_updated = datetime.utcnow()
    else:
        # Create new progress entry
        progress = ProgressLevel(
            uid=current_user.uid,
            cid=course.cid,
            progress_json=progress_data.progress_json
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name,
        progress_json=progress.progress_json or {},
        last_updated=progress.last_updated
    )


@router.get("/{user_id}", response_model=AllProgressResponse)
def get_user_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only access their own progress (or admins can access any)
    if current_user.uid != user_id and current_user.is_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's progress"
        )
    
    # Get all progress entries for user with course info
    progress_entries = db.query(ProgressLevel).filter(
        ProgressLevel.uid == user_id
    ).all()
    
    progress_list = []
    for p in progress_entries:
        course = db.query(Course).filter(Course.cid == p.cid).first()
        progress_list.append(
            ProgressResponse(
                progress_id=p.progress_id,
                uid=p.uid,
                cid=p.cid,
                course_name=course.course_name if course else "Unknown",
                progress_json=p.progress_json or {},
                last_updated=p.last_updated
            )
        )
    
    return AllProgressResponse(
        progress=progress_list,
        total_courses=len(progress_entries)
    )


@router.get("/course/{course_name}", response_model=ProgressResponse)
def get_course_progress(
    course_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the course
    course = db.query(Course).filter(
        Course.course_name == course_name
    ).first()
    
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == course.cid
    ).first()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress not found for this course"
        )
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name,
        progress_json=progress.progress_json or {},
        last_updated=progress.last_updated
    )

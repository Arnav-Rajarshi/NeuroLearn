from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import get_db
from NeuroLearn.backend.models.models import User, ProgressLevel, Course
from NeuroLearn.backend.core.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


# Pydantic schemas
class ProgressUpdate(BaseModel):
    cid: int
    top_id: Optional[int] = None
    progress_json: Dict[str, Any] = {}


class ProgressResponse(BaseModel):
    progress_id: int
    uid: int
    cid: int
    course_name: Optional[str] = None
    top_id: Optional[int] = None
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
    """Update or create progress for a course"""
    # Verify course exists
    course = db.query(Course).filter(Course.cid == progress_data.cid).first()
    
    # Find existing progress for this user and course
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == progress_data.cid
    ).first()
    
    if progress:
        # Update existing progress
        progress.progress_json = progress_data.progress_json
        progress.top_id = progress_data.top_id
        progress.last_updated = datetime.utcnow()
    else:
        # Create new progress entry
        progress = ProgressLevel(
            uid=current_user.uid,
            cid=progress_data.cid,
            top_id=progress_data.top_id,
            progress_json=progress_data.progress_json
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name if course else None,
        top_id=progress.top_id,
        progress_json=progress.progress_json or {},
        last_updated=progress.last_updated
    )


@router.get("/{user_id}", response_model=AllProgressResponse)
def get_user_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all progress entries for a user"""
    # Users can only access their own progress
    if current_user.uid != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's progress"
        )
    
    # Get all progress entries for user
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
                course_name=course.course_name if course else None,
                top_id=p.top_id,
                progress_json=p.progress_json or {},
                last_updated=p.last_updated
            )
        )
    
    return AllProgressResponse(
        progress=progress_list,
        total_courses=len(progress_entries)
    )


@router.get("/course/{cid}", response_model=ProgressResponse)
def get_course_progress(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get progress for current user in a specific course"""
    course = db.query(Course).filter(Course.cid == cid).first()
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    
    if not progress:
        # Return empty progress if not found
        return ProgressResponse(
            progress_id=0,
            uid=current_user.uid,
            cid=cid,
            course_name=course.course_name if course else None,
            top_id=None,
            progress_json={},
            last_updated=datetime.utcnow()
        )
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name if course else None,
        top_id=progress.top_id,
        progress_json=progress.progress_json or {},
        last_updated=progress.last_updated
    )

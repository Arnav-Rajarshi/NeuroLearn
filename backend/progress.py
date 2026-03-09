from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict ,Any ,Optional 
from datetime import datetime
import json

from database import get_db
from models import User, Progress
from auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


# Pydantic schemas
class ProgressUpdate(BaseModel):
    cid: int
    top_id: Optional[int] = None
    progress_json: Optional[Dict[str, Any]] = {}


class ProgressResponse(BaseModel):
    progress_id: int
    uid: int
    cid: int
    top_id: Optional[int]
    progress_json: Dict[str, Any]
    last_updated: datetime

    class Config:
        from_attributes = True


class AllProgressResponse(BaseModel):
    progress: List[ProgressResponse]
    total_xp: int
    total_courses: int
    total_completed_topics: int


# Helper function to parse completed_topics JSON
def parse_completed_topics(progress: Progress) -> List[str]:
    try:
        return json.loads(progress.completed_topics) if progress.completed_topics else []
    except:
        return []


# Endpoints
@router.post("/update", response_model=ProgressResponse)
def update_progress(
    progress_data: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find existing progress for this course
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.course_name == progress_data.course_name
    ).first()
    
    completed_topics_json = json.dumps(progress_data.completed_topics)
    
    if progress:
        # Update existing progress
        progress.completed_topics = completed_topics_json
        progress.total_topics = progress_data.total_topics
        progress.questions_attempted = progress_data.questions_attempted
        progress.correct_answers = progress_data.correct_answers
        progress.roadmap_progress = progress_data.roadmap_progress
        progress.goal_deadline = progress_data.goal_deadline
        progress.total_xp = progress_data.total_xp
        progress.updated_at = datetime.utcnow()
    else:
        # Create new progress entry
        progress = Progress(
            user_id=current_user.id,
            course_name=progress_data.course_name,
            completed_topics=completed_topics_json,
            total_topics=progress_data.total_topics,
            questions_attempted=progress_data.questions_attempted,
            correct_answers=progress_data.correct_answers,
            roadmap_progress=progress_data.roadmap_progress,
            goal_deadline=progress_data.goal_deadline,
            total_xp=progress_data.total_xp
        )
        db.add(progress)
    
    db.commit()
    db.refresh(progress)
    
    return ProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        course_name=progress.course_name,
        completed_topics=parse_completed_topics(progress),
        total_topics=progress.total_topics,
        questions_attempted=progress.questions_attempted,
        correct_answers=progress.correct_answers,
        roadmap_progress=progress.roadmap_progress,
        goal_deadline=progress.goal_deadline,
        total_xp=progress.total_xp,
        updated_at=progress.updated_at
    )


@router.get("/{user_id}", response_model=AllProgressResponse)
def get_user_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Users can only access their own progress (or admins can access any)
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's progress"
        )
    
    # Get all progress entries for user
    progress_entries = db.query(Progress).filter(Progress.user_id == user_id).all()
    
    # Calculate totals
    total_xp = sum(p.total_xp for p in progress_entries)
    total_completed_topics = sum(
        len(parse_completed_topics(p)) for p in progress_entries
    )
    
    progress_list = [
        ProgressResponse(
            id=p.id,
            user_id=p.user_id,
            course_name=p.course_name,
            completed_topics=parse_completed_topics(p),
            total_topics=p.total_topics,
            questions_attempted=p.questions_attempted,
            correct_answers=p.correct_answers,
            roadmap_progress=p.roadmap_progress,
            goal_deadline=p.goal_deadline,
            total_xp=p.total_xp,
            updated_at=p.updated_at
        )
        for p in progress_entries
    ]
    
    return AllProgressResponse(
        progress=progress_list,
        total_xp=total_xp,
        total_courses=len(progress_entries),
        total_completed_topics=total_completed_topics
    )


@router.get("/course/{course_name}", response_model=ProgressResponse)
def get_course_progress(
    course_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    progress = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.course_name == course_name
    ).first()
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Progress not found for this course"
        )
    
    return ProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        course_name=progress.course_name,
        completed_topics=parse_completed_topics(progress),
        total_topics=progress.total_topics,
        questions_attempted=progress.questions_attempted,
        correct_answers=progress.correct_answers,
        roadmap_progress=progress.roadmap_progress,
        goal_deadline=progress.goal_deadline,
        total_xp=progress.total_xp,
        updated_at=progress.updated_at
    )

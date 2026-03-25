from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import get_db
from models import User, ProgressLevel, Course
from auth import get_current_user

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


def get_user_progress_strict(
    db: Session,
    uid: int,
    cid: int
) -> Optional[ProgressLevel]:
    """
    Get user progress with strict type matching.
    
    FIXES:
    - Cast both uid and cid to int
    - Validate returned record matches exactly
    - Discard mismatched records
    """
    uid = int(uid)
    cid = int(cid)
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    # Validate consistency
    if progress is not None:
        if int(progress.uid) != uid or int(progress.cid) != cid:
            return None
    
    return progress


def get_or_create_progress(
    db: Session,
    uid: int,
    cid: int
) -> ProgressLevel:
    """
    Get existing progress or create new with proper initialization.
    
    FIXES:
    - Check existence before creating (prevent duplicates)
    - Initialize progress_json as empty list, never NULL
    - Initialize topics_to_be_shown_json as empty list
    """
    uid = int(uid)
    cid = int(cid)
    
    progress = get_user_progress_strict(db, uid, cid)
    
    if progress is None:
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            top_id=None,
            progress_json=[],
            topics_to_be_shown_json=[]
        )
        db.add(progress)
        db.flush()
    else:
        # Fix NULL values in existing records
        needs_update = False
        
        if progress.progress_json is None:
            progress.progress_json = []
            needs_update = True
        
        if hasattr(progress, 'topics_to_be_shown_json') and progress.topics_to_be_shown_json is None:
            progress.topics_to_be_shown_json = []
            needs_update = True
        
        if needs_update:
            flag_modified(progress, "progress_json")
            if hasattr(progress, 'topics_to_be_shown_json'):
                flag_modified(progress, "topics_to_be_shown_json")
            db.flush()
    
    return progress


def convert_progress_to_dict(progress_json: Any) -> Dict[str, Any]:
    """Convert progress_json to dict format for API response."""
    if progress_json is None:
        return {}
    
    if isinstance(progress_json, dict):
        return progress_json
    
    if isinstance(progress_json, list):
        return {topic: True for topic in progress_json}
    
    return {}


# Endpoints
@router.post("/update", response_model=ProgressResponse)
def update_progress(
    progress_data: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update or create progress for a course.
    
    FIXES:
    - Check for existing record before creating
    - Never overwrite with NULL
    - Properly commit changes
    """
    uid = int(current_user.uid)
    cid = int(progress_data.cid)
    
    # Verify course exists
    course = db.query(Course).filter(Course.cid == cid).first()
    
    # Get or create progress (prevents duplicates)
    progress = get_or_create_progress(db, uid, cid)
    
    # Validate consistency
    if int(progress.uid) != uid or int(progress.cid) != cid:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Progress record mismatch"
        )
    
    # Update progress data
    new_progress = progress_data.progress_json
    if new_progress is None:
        new_progress = {}
    
    # Merge with existing progress (don't overwrite)
    current = convert_progress_to_dict(progress.progress_json)
    current.update(new_progress)
    
    # Convert to list format for storage
    progress_list = [k for k, v in current.items() if v is True]
    
    progress.progress_json = progress_list
    progress.top_id = progress_data.top_id
    progress.last_updated = datetime.utcnow()
    
    flag_modified(progress, "progress_json")
    
    db.commit()
    db.refresh(progress)
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name if course else None,
        top_id=progress.top_id,
        progress_json=convert_progress_to_dict(progress.progress_json),
        last_updated=progress.last_updated
    )


@router.get("/{user_id}", response_model=AllProgressResponse)
def get_user_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all progress entries for a user.
    
    FIXES:
    - Strict type casting
    - Authorization check
    """
    user_id = int(user_id)
    
    # Users can only access their own progress
    if int(current_user.uid) != user_id:
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
        # Validate each record
        if int(p.uid) != user_id:
            continue
        
        course = db.query(Course).filter(Course.cid == p.cid).first()
        progress_list.append(
            ProgressResponse(
                progress_id=p.progress_id,
                uid=p.uid,
                cid=p.cid,
                course_name=course.course_name if course else None,
                top_id=p.top_id,
                progress_json=convert_progress_to_dict(p.progress_json),
                last_updated=p.last_updated
            )
        )
    
    return AllProgressResponse(
        progress=progress_list,
        total_courses=len(progress_list)
    )


@router.get("/course/{cid}", response_model=ProgressResponse)
def get_course_progress(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get progress for current user in a specific course.
    
    FIXES:
    - Strict type matching
    - Never return NULL progress_json
    """
    cid = int(cid)
    uid = int(current_user.uid)
    
    course = db.query(Course).filter(Course.cid == cid).first()
    
    progress = get_user_progress_strict(db, uid, cid)
    
    if not progress:
        # Return empty progress if not found
        return ProgressResponse(
            progress_id=0,
            uid=uid,
            cid=cid,
            course_name=course.course_name if course else None,
            top_id=None,
            progress_json={},
            last_updated=datetime.utcnow()
        )
    
    # Validate consistency
    if int(progress.uid) != uid or int(progress.cid) != cid:
        return ProgressResponse(
            progress_id=0,
            uid=uid,
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
        progress_json=convert_progress_to_dict(progress.progress_json),
        last_updated=progress.last_updated
    )


@router.post("/topic/complete")
def complete_topic(
    cid: int,
    topic_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a specific topic as complete.
    
    FIXES:
    - Append to progress_json list
    - Commit properly
    - Never overwrite with NULL
    """
    cid = int(cid)
    uid = int(current_user.uid)
    
    progress = get_or_create_progress(db, uid, cid)
    
    # Get current progress as list
    current_progress = progress.progress_json
    if current_progress is None:
        current_progress = []
    elif isinstance(current_progress, dict):
        current_progress = [k for k, v in current_progress.items() if v is True]
    else:
        current_progress = list(current_progress)
    
    # Append if not already complete
    if topic_key not in current_progress:
        current_progress.append(topic_key)
    
    progress.progress_json = current_progress
    progress.last_updated = datetime.utcnow()
    
    flag_modified(progress, "progress_json")
    
    db.commit()
    
    return {
        "message": "Topic marked as complete",
        "topic_key": topic_key,
        "total_completed": len(current_progress)
    }

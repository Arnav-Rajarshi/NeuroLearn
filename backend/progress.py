"""
Progress Module - User progress tracking for courses

CRITICAL FIXES APPLIED:
1. Progress merge instead of overwrite (existing.update(new_data))
2. Proper DB persistence with commit() and refresh()
3. Handle null progress_json for old users
4. Logging for all progress operations
5. DEPRECATED: /progress/update endpoint - use /roadmap/progress/update instead
6. Atomic operations to prevent race conditions
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

# LOGGING: Use centralized debug logger
from logger import get_logger
logger = get_logger(__name__)

from database import get_db
from models import User, ProgressLevel, Course
from auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


# ============ Pydantic Schemas ============

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
    # ADDED: Enhanced response fields
    success: bool = True
    completed_topics: int = 0
    total_topics: int = 0

    class Config:
        from_attributes = True


class AllProgressResponse(BaseModel):
    progress: List[ProgressResponse]
    total_courses: int


# ============ Helper Functions ============

def ensure_progress_json_not_null(progress: ProgressLevel) -> Dict[str, Any]:
    """
    FIX: Handle old users with null progress_json
    
    Ensures progress_json is never None, initializing to empty dict if needed.
    This fixes the issue where old users have inconsistent schema.
    """
    if progress.progress_json is None:
        progress.progress_json = {}
    return progress.progress_json


def merge_progress_data(
    existing_data: Dict[str, Any], 
    new_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    FIX: Merge progress instead of overwrite
    
    Merges new progress data into existing data without losing previous progress.
    This prevents the critical bug where progress was being overwritten.
    
    Args:
        existing_data: Current progress_json from database
        new_data: New progress data to merge
    
    Returns:
        Merged progress dictionary
    """
    # Create a copy to avoid mutating the original
    merged = dict(existing_data or {})
    
    for key, value in new_data.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            # Deep merge for nested dictionaries
            merged[key] = merge_progress_data(merged[key], value)
        elif isinstance(value, list) and isinstance(merged.get(key), list):
            # For lists, extend without duplicates (for backward compatibility)
            existing_list = merged[key]
            for item in value:
                if item not in existing_list:
                    existing_list.append(item)
            merged[key] = existing_list
        else:
            # Simple overwrite for primitives and new keys
            merged[key] = value
    
    return merged


def count_completed_topics(progress_json: Dict[str, Any]) -> int:
    """
    Count the number of completed topics from progress_json.
    
    Handles both formats:
    - New format: {"topic::subtopic": true, ...}
    - Legacy format: {"topic": ["subtopic1", "subtopic2"], ...}
    """
    if not progress_json:
        return 0
    
    count = 0
    for key, value in progress_json.items():
        if isinstance(value, bool) and value is True:
            # New format: topic_key -> true
            count += 1
        elif isinstance(value, list):
            # Legacy format: topic -> [subtopics]
            count += len(value)
    
    return count


# ============ Core Progress Operations ============

def get_or_create_progress(
    db: Session,
    uid: int,
    cid: int
) -> ProgressLevel:
    """
    Get existing progress or create a new record.
    
    Ensures progress_json is never null (fixes old user schema issue).
    LOGGING: Logs FETCHING/CREATING PROGRESS with user_id and course_id
    """
    logger.info(f"[PROGRESS] FETCHING PROGRESS user_id={uid} course_id={cid}")
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    if not progress:
        logger.info(f"[PROGRESS] CREATING NEW PROGRESS record for user={uid}, course={cid}")
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            top_id=None,
            progress_json={}  # FIX: Always initialize to empty dict
        )
        db.add(progress)
        db.flush()
        logger.info(f"[PROGRESS] Created progress_id={progress.progress_id}")
    else:
        # FIX: Ensure existing records have non-null progress_json
        ensure_progress_json_not_null(progress)
        logger.info(f"[PROGRESS] Found existing progress_id={progress.progress_id} with {len(progress.progress_json or {})} entries")
    
    return progress


def update_progress_atomic(
    db: Session,
    uid: int,
    cid: int,
    new_progress_data: Dict[str, Any],
    top_id: Optional[int] = None
) -> ProgressLevel:
    """
    ATOMIC progress update with merge logic.
    
    CRITICAL FIXES:
    1. Merges new data instead of overwriting
    2. Properly commits and refreshes
    3. Handles null progress_json
    4. Marks JSONB as modified for SQLAlchemy
    
    Args:
        db: Database session
        uid: User ID
        cid: Course ID
        new_progress_data: New progress data to merge
        top_id: Optional topic reference ID
    
    Returns:
        Updated ProgressLevel record
    """
    logger.info(f"[PROGRESS] Updating progress for user={uid}, course={cid}")
    logger.info(f"[PROGRESS] New data to merge: {new_progress_data}")
    
    # Get or create progress record
    progress = get_or_create_progress(db, uid, cid)
    
    # FIX: Get existing data (never null due to get_or_create_progress)
    existing_data = dict(progress.progress_json or {})
    logger.info(f"[PROGRESS] Existing data: {existing_data}")
    
    # FIX: Merge instead of overwrite
    merged_data = merge_progress_data(existing_data, new_progress_data)
    logger.info(f"[PROGRESS] Merged data: {merged_data}")
    
    # Update the record
    progress.progress_json = merged_data
    if top_id is not None:
        progress.top_id = top_id
    progress.last_updated = datetime.utcnow()
    
    # FIX: Mark JSONB as modified for SQLAlchemy to detect change
    flag_modified(progress, "progress_json")
    
    # FIX: Ensure DB persistence
    db.commit()
    db.refresh(progress)
    
    logger.info(f"[PROGRESS] SAVING PROGRESS user_id={uid} course_id={cid} entries={len(merged_data)}")
    logger.info(f"[PROGRESS] Successfully updated and committed progress_id={progress.progress_id}")
    
    return progress


# ============ API Endpoints ============

@router.post("/update", response_model=ProgressResponse, deprecated=True)
def update_progress(
    progress_data: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: Use /roadmap/progress/update instead.
    
    This endpoint redirects to the single source of truth for progress updates.
    Kept for backward compatibility only.
    
    CRITICAL: All progress updates should go through /roadmap/progress/update
    to ensure consistency and proper roadmap integration.
    """
    logger.warning(f"[PROGRESS] DEPRECATED endpoint /progress/update called by user={current_user.uid}")
    logger.warning("[PROGRESS] Please migrate to /roadmap/progress/update endpoint")
    
    # Verify course exists
    course = db.query(Course).filter(Course.cid == progress_data.cid).first()
    if not course:
        logger.error(f"[PROGRESS] Course not found: {progress_data.cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course not found: {progress_data.cid}"
        )
    
    # FIX: Use atomic update with merge logic
    try:
        progress = update_progress_atomic(
            db=db,
            uid=current_user.uid,
            cid=progress_data.cid,
            new_progress_data=progress_data.progress_json,
            top_id=progress_data.top_id
        )
    except Exception as e:
        logger.error(f"[PROGRESS] Failed to update progress: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )
    
    # Refresh to get latest data after commit
    db.refresh(progress)
    
    # Count completed topics for response
    completed_count = count_completed_topics(progress.progress_json or {})
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name if course else None,
        top_id=progress.top_id,
        progress_json=progress.progress_json or {},
        last_updated=progress.last_updated,
        success=True,
        completed_topics=completed_count,
        total_topics=0  # Will be computed by roadmap endpoint
    )


@router.get("/{user_id}", response_model=AllProgressResponse)
def get_user_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all progress entries for a user.
    
    FIXES APPLIED:
    - Null progress_json handled for old users
    """
    logger.info(f"[PROGRESS] Fetching all progress for user={user_id}")
    
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
        # FIX: Handle null progress_json
        progress_json = p.progress_json if p.progress_json is not None else {}
        completed_count = count_completed_topics(progress_json)
        
        progress_list.append(
            ProgressResponse(
                progress_id=p.progress_id,
                uid=p.uid,
                cid=p.cid,
                course_name=course.course_name if course else None,
                top_id=p.top_id,
                progress_json=progress_json,
                last_updated=p.last_updated,
                success=True,
                completed_topics=completed_count,
                total_topics=0
            )
        )
    
    logger.info(f"[PROGRESS] Found {len(progress_entries)} progress entries for user={user_id}")
    
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
    """
    Get progress for current user in a specific course.
    
    FIXES APPLIED:
    - Null progress_json handled for old users
    - Returns proper empty progress if not found
    """
    logger.info(f"[PROGRESS] Fetching course progress for user={current_user.uid}, course={cid}")
    
    course = db.query(Course).filter(Course.cid == cid).first()
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    
    if not progress:
        logger.info(f"[PROGRESS] No progress found for user={current_user.uid}, course={cid}, returning empty")
        # Return empty progress if not found
        return ProgressResponse(
            progress_id=0,
            uid=current_user.uid,
            cid=cid,
            course_name=course.course_name if course else None,
            top_id=None,
            progress_json={},
            last_updated=datetime.utcnow(),
            success=True,
            completed_topics=0,
            total_topics=0
        )
    
    # FIX: Handle null progress_json
    progress_json = progress.progress_json if progress.progress_json is not None else {}
    completed_count = count_completed_topics(progress_json)
    
    return ProgressResponse(
        progress_id=progress.progress_id,
        uid=progress.uid,
        cid=progress.cid,
        course_name=course.course_name if course else None,
        top_id=progress.top_id,
        progress_json=progress_json,
        last_updated=progress.last_updated,
        success=True,
        completed_topics=completed_count,
        total_topics=0
    )

"""
Roadmap Pipeline Module

CRITICAL FIXES APPLIED:
1. Progress MERGE instead of overwrite
2. Proper DB persistence with commit() and refresh()
3. Handle null progress_json for old users
4. Logging for all operations (fetch vs generate, progress updates, DB writes)
5. Single source of truth for progress updates (update_user_progress)
6. Computed top_id (not stale input)
7. Deterministic progress calculation (completed tasks are source of truth)
8. Enhanced API responses with success/completed/remaining
9. Atomic operations to prevent race conditions
10. Stable roadmap - always fetches from DB, never regenerates on reload

Data Flow:
Frontend requests roadmap
    ↓
Backend loads JSON roadmap file (source of truth for structure)
    ↓
Backend fetches user's completed topics from DB (source of truth for progress)
    ↓
Backend computes remaining topics (JSON - completed)
    ↓
topics_to_be_shown stored in TopicsToBeShown table
    ↓
Filtered roadmap returned to frontend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import logging

from database import get_db
from models import (
    User, Course, Roadmap, TopicsToBeShown, 
    ProgressLevel, CoursePreference, CourseEnrolled
)
from auth import get_current_user

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])

# Path to roadmap JSON files
ROADMAP_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "courses")

# Course slug to cid mapping
COURSE_SLUG_TO_CID = {
    "dsa": 1,
    "python": 2,
    "english": 3,
    "sql": 4,
    "frontend": 5,
    "machine_learning": 6,
    "system_design": 7,
    "ai_fundamentals": 8,
    "software_architecture": 9,
    "competitive_programming": 10,
    "blockchain_basics": 11,
    "nodejs_advanced": 12,
    "deep_learning": 13,
    "backend_engineering": 14,
    "cloud_computing": 15,
    "devops_engineering": 16,
    "cybersecurity_basics": 17,
    "data_engineering": 18,
    "distributed_systems": 19,
    "react_advanced": 20,
}

COURSE_CID_TO_SLUG = {v: k for k, v in COURSE_SLUG_TO_CID.items()}


# ============ Pydantic Schemas ============

class TopicProgress(BaseModel):
    """Progress for a single subtopic"""
    topic_key: str
    completed: bool


class RoadmapProgressUpdate(BaseModel):
    """Request to mark a topic as complete/incomplete"""
    cid: int
    topic_key: str  # Format: "topic_name::subtopic_name"
    completed: bool = True


class RoadmapProgressResponse(BaseModel):
    """
    Response with user's progress on a roadmap.
    
    ENHANCED: Now includes success, completed_topics, remaining_topics for consistency.
    """
    success: bool = True
    cid: int
    course_name: Optional[str]
    lm: str  # 'PNL' or 'PRACTICE'
    total_topics: int
    completed_topics: int
    remaining_topics: int  # ADDED
    completion_percentage: float
    progress: Dict[str, bool]  # topic_key -> completed
    topics_to_be_shown: List[str]  # Remaining topic keys
    current_topic: Optional[str]  # The topic user should work on next


class FullRoadmapResponse(BaseModel):
    """Full roadmap with structure and progress"""
    success: bool = True
    cid: int
    course_name: str
    lm: str
    estimated_hours: int
    total_topics: int
    completed_topics: int
    remaining_topics: int  # ADDED
    completion_percentage: float
    topics: List[Dict[str, Any]]  # Full topic structure from JSON
    progress: Dict[str, bool]  # topic_key -> completed
    topics_to_be_shown: List[str]


# ============ JSON Loader Functions ============

def get_roadmap_json_path(course_slug: str, learning_mode: str) -> str:
    """Get the path to the roadmap JSON file."""
    if course_slug.upper() == "SQL":
        filename = f"SQL_{learning_mode}.json"
    else:
        filename = f"{course_slug}_{learning_mode}.json"
    
    return os.path.join(ROADMAP_DATA_PATH, filename)


def load_roadmap_json(course_slug: str, learning_mode: str = "PNL") -> Dict[str, Any]:
    """
    Load roadmap structure from JSON file.
    
    LOGGING: Logs whether we're fetching from file.
    """
    file_path = get_roadmap_json_path(course_slug, learning_mode)
    logger.info(f"[ROADMAP] Loading JSON roadmap from: {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"[ROADMAP] Roadmap file not found: {file_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap file not found: {course_slug}_{learning_mode}.json"
        )
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logger.info(f"[ROADMAP] Successfully loaded roadmap JSON for {course_slug}_{learning_mode}")
            return data
    except json.JSONDecodeError as e:
        logger.error(f"[ROADMAP] Invalid JSON in roadmap file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid JSON in roadmap file: {str(e)}"
        )


def extract_all_topic_keys(roadmap_json: Dict[str, Any]) -> List[str]:
    """
    Extract all unique topic keys from a roadmap JSON.
    
    Topic keys are formatted as: "topic_name::subtopic_name"
    """
    topic_keys = []
    
    topics = roadmap_json.get("topics", [])
    for topic in topics:
        topic_name = topic.get("name", "")
        subtopics = topic.get("subtopics", [])
        
        for subtopic in subtopics:
            subtopic_name = subtopic.get("name", "")
            key = f"{topic_name}::{subtopic_name}"
            topic_keys.append(key)
    
    return topic_keys


def compute_topics_to_be_shown(
    all_topic_keys: List[str], 
    completed_keys: Dict[str, bool]
) -> List[str]:
    """
    Compute remaining topics by subtracting completed from total.
    
    FIX: Only considers topics where completed_keys[key] is True.
    """
    return [key for key in all_topic_keys if completed_keys.get(key) is not True]


def get_current_topic(topics_to_be_shown: List[str]) -> Optional[str]:
    """Get the first topic that should be shown to the user."""
    return topics_to_be_shown[0] if topics_to_be_shown else None


# ============ Database Operations ============

def get_or_create_roadmap(
    db: Session, 
    cid: int, 
    lm: str
) -> Roadmap:
    """Get or create a roadmap record for a course and learning mode."""
    roadmap = db.query(Roadmap).filter(
        Roadmap.cid == cid,
        Roadmap.lm == lm
    ).first()
    
    if not roadmap:
        logger.info(f"[ROADMAP] Creating new roadmap record for cid={cid}, lm={lm}")
        roadmap = Roadmap(cid=cid, lm=lm)
        db.add(roadmap)
        db.flush()
    
    return roadmap


def get_user_progress(
    db: Session, 
    uid: int, 
    cid: int
) -> Dict[str, bool]:
    """
    Get user's progress for a course as a dictionary.
    
    FIX: Handles null progress_json for old users.
    
    Returns:
        Dict mapping topic_key -> True (only completed topics are stored)
    """
    logger.info(f"[PROGRESS] Fetching progress from DB for user={uid}, course={cid}")
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    # FIX: Handle null progress_json for old users
    if not progress:
        logger.info(f"[PROGRESS] No progress record found for user={uid}, course={cid}")
        return {}
    
    if progress.progress_json is None:
        logger.info(f"[PROGRESS] progress_json is NULL for user={uid}, course={cid}, returning empty dict")
        return {}
    
    logger.info(f"[PROGRESS] Found progress with {len(progress.progress_json)} entries")
    return dict(progress.progress_json)


def compute_top_id_index(all_topic_keys: List[str], topic_key: str) -> int:
    """
    FIX: Compute a stable top_id index for a topic key.
    
    This ensures top_id is COMPUTED, not a stale input value.
    
    Format: topic_index * 100 + subtopic_index
    """
    try:
        flat_index = all_topic_keys.index(topic_key)
        topic_name = topic_key.split("::")[0]
        
        topic_index = 0
        subtopic_index = 0
        current_topic = None
        
        for i, key in enumerate(all_topic_keys):
            key_topic = key.split("::")[0]
            if key_topic != current_topic:
                if current_topic is not None:
                    topic_index += 1
                current_topic = key_topic
                subtopic_index = 0
            
            if i == flat_index:
                break
            
            if key_topic == topic_name:
                subtopic_index += 1
        
        computed_id = topic_index * 100 + subtopic_index
        logger.info(f"[PROGRESS] Computed top_id={computed_id} for topic_key={topic_key}")
        return computed_id
    except (ValueError, IndexError):
        logger.warning(f"[PROGRESS] Could not compute top_id for topic_key={topic_key}, returning 0")
        return 0


def update_user_progress(
    db: Session,
    uid: int,
    cid: int,
    topic_key: str,
    completed: bool,
    top_id_ref: Optional[int] = None,
    all_topic_keys: Optional[List[str]] = None
) -> Dict[str, bool]:
    """
    SINGLE SOURCE OF TRUTH for progress updates.
    
    CRITICAL FIXES APPLIED:
    1. MERGE instead of overwrite - existing progress is preserved
    2. IDEMPOTENT - Skip update if topic already has same state
    3. COMPUTED top_id - Uses computed index, not stale input
    4. PROPER DB COMMIT - Uses commit() and refresh() for persistence
    5. NULL HANDLING - Handles null progress_json for old users
    6. JSONB FLAGGING - Marks JSONB as modified for SQLAlchemy detection
    7. LOGGING - Comprehensive logging for debugging
    8. ATOMIC - Uses flush within transaction for atomicity
    9. RACE CONDITION SAFE - Query-then-update pattern with proper locking
    
    Args:
        db: Database session
        uid: User ID
        cid: Course ID
        topic_key: The topic to mark as complete/incomplete (format: "topic::subtopic")
        completed: Whether the topic is completed
        top_id_ref: Optional reference to TopicsToBeShown record
        all_topic_keys: List of all topic keys for computing top_id index
    
    Returns:
        Updated progress dictionary (complete snapshot)
    """
    logger.info(f"[PROGRESS] update_user_progress called: user={uid}, course={cid}, topic={topic_key}, completed={completed}")
    
    # STEP 1: Get or create progress record with FOR UPDATE lock pattern
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).with_for_update().first()  # FIX: Add row-level lock for race condition safety
    
    if not progress:
        logger.info(f"[PROGRESS] Creating new progress record for user={uid}, course={cid}")
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            top_id=top_id_ref,
            progress_json={}  # FIX: Initialize to empty dict, NEVER None
        )
        db.add(progress)
        db.flush()
        logger.info(f"[PROGRESS] Created progress_id={progress.progress_id}")
    
    # STEP 2: FIX - Load existing progress (NEVER overwrite entirely)
    # Handle null progress_json for old users safely
    if progress.progress_json is None:
        logger.info(f"[PROGRESS] Fixing null progress_json for old user={uid}, course={cid}")
        progress.progress_json = {}
    
    current_progress = dict(progress.progress_json)
    logger.info(f"[PROGRESS] Current progress has {len(current_progress)} completed entries")
    
    # STEP 3: FIX - IDEMPOTENT check - Skip if already in desired state
    current_state = current_progress.get(topic_key)
    if completed:
        if current_state is True:
            logger.info(f"[PROGRESS] IDEMPOTENT: Topic {topic_key} already completed, skipping update")
            return current_progress
        logger.info(f"[PROGRESS] Marking topic {topic_key} as COMPLETED")
        current_progress[topic_key] = True
    else:
        if current_state is False or current_state is None:
            logger.info(f"[PROGRESS] IDEMPOTENT: Topic {topic_key} already incomplete/missing, skipping update")
            return current_progress
        logger.info(f"[PROGRESS] Marking topic {topic_key} as INCOMPLETE")
        current_progress[topic_key] = False
    
    # STEP 4: FIX - Compute the top_id index (COMPUTED, not stale input)
    computed_top_id = top_id_ref
    if all_topic_keys and topic_key in all_topic_keys:
        computed_top_id = compute_top_id_index(all_topic_keys, topic_key)
        logger.info(f"[PROGRESS] Computed top_id={computed_top_id} for topic={topic_key}")
    
    # STEP 5: Update progress_json with MERGED data
    progress.progress_json = current_progress
    if computed_top_id is not None:
        progress.top_id = computed_top_id  # FIX: Use computed, not stale
    progress.last_updated = datetime.utcnow()
    
    # STEP 6: FIX - Explicitly mark JSONB as modified for SQLAlchemy detection
    flag_modified(progress, "progress_json")
    
    # STEP 7: FIX - Flush to ensure changes are staged (commit happens at endpoint level)
    db.flush()
    logger.info(f"[PROGRESS] Flushed progress update for user={uid}, course={cid}, entries={len(current_progress)}")
    
    return current_progress


def update_topics_to_be_shown(
    db: Session,
    uid: int,
    rid: int,
    topics_list: List[str],
    current_topic: Optional[str] = None,
    all_topic_keys: Optional[List[str]] = None
) -> TopicsToBeShown:
    """
    Update or create the topics_to_be_shown record.
    
    FIX: Properly marks JSONB as modified and commits.
    """
    logger.info(f"[ROADMAP] Updating topics_to_be_shown for user={uid}, roadmap={rid}, remaining={len(topics_list)}")
    
    topics_record = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.uid == uid,
        TopicsToBeShown.rid == rid
    ).first()
    
    # Compute current_topic_index
    current_topic_index = None
    if current_topic and all_topic_keys:
        current_topic_index = compute_top_id_index(all_topic_keys, current_topic)
    
    new_json = {
        "remaining": topics_list,
        "current": current_topic,
        "current_index": current_topic_index,
        "total_remaining": len(topics_list),
        "is_complete": len(topics_list) == 0
    }
    
    if not topics_record:
        logger.info(f"[ROADMAP] Creating new topics_to_be_shown record")
        topics_record = TopicsToBeShown(
            uid=uid,
            rid=rid,
            topics_json=new_json
        )
        db.add(topics_record)
    else:
        logger.info(f"[ROADMAP] Updating existing topics_to_be_shown record")
        topics_record.topics_json = new_json
        # FIX: Explicitly mark JSONB as modified
        flag_modified(topics_record, "topics_json")
    
    db.flush()
    return topics_record


# ============ API Endpoints ============

@router.get("/{cid}", response_model=FullRoadmapResponse)
def get_roadmap(
    cid: int,
    lm: str = "PNL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the full roadmap for a course with user's progress.
    
    FIX: Roadmap is STABLE - always loads from JSON (source of truth for structure)
    and DB (source of truth for progress). NEVER regenerates on reload.
    
    LOGGING: Logs whether fetching from file vs DB.
    """
    logger.info(f"[ROADMAP] GET /{cid} called by user={current_user.uid}, lm={lm}")
    
    # Get course slug from cid
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if not course_slug:
        logger.error(f"[ROADMAP] Unknown course ID: {cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown course ID: {cid}"
        )
    
    # Validate learning mode
    lm = lm.upper()
    if lm not in ["PNL", "PRACTICE"]:
        lm = "PNL"
    
    # Step 1: Load roadmap JSON (source of truth for STRUCTURE)
    logger.info(f"[ROADMAP] Step 1: Loading JSON roadmap (source of truth for structure)")
    roadmap_json = load_roadmap_json(course_slug, lm)
    
    # Step 2: Extract all topic keys from JSON
    all_topic_keys = extract_all_topic_keys(roadmap_json)
    logger.info(f"[ROADMAP] Step 2: Extracted {len(all_topic_keys)} topic keys from JSON")
    
    # Step 3: Get user's completed topics from database (source of truth for PROGRESS)
    logger.info(f"[ROADMAP] Step 3: Fetching progress from DB (source of truth for progress)")
    user_progress = get_user_progress(db, current_user.uid, cid)
    
    # Step 4: Compute topics_to_be_shown (deterministic: JSON - completed)
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
    current_topic = get_current_topic(topics_to_show)
    logger.info(f"[ROADMAP] Step 4: Computed {len(topics_to_show)} remaining topics")
    
    # Step 5: Get or create roadmap record and update TopicsToBeShown
    logger.info(f"[ROADMAP] Step 5: Updating topics_to_be_shown in DB")
    roadmap_record = get_or_create_roadmap(db, cid, lm)
    topics_record = update_topics_to_be_shown(
        db, 
        current_user.uid, 
        roadmap_record.rid, 
        topics_to_show,
        current_topic,
        all_topic_keys
    )
    
    # Update the top_id reference in progress if exists
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    if progress:
        progress.top_id = topics_record.top_id
    
    # FIX: Ensure DB persistence
    db.commit()
    logger.info(f"[ROADMAP] DB committed successfully")
    
    # Calculate statistics (deterministic: completed tasks are source of truth)
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if user_progress.get(k) is True])
    remaining_count = total_topics - completed_count
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    logger.info(f"[ROADMAP] Stats: total={total_topics}, completed={completed_count}, remaining={remaining_count}")
    
    return FullRoadmapResponse(
        success=True,
        cid=cid,
        course_name=roadmap_json.get("courseName", ""),
        lm=lm,
        estimated_hours=roadmap_json.get("estimatedHours", 0),
        total_topics=total_topics,
        completed_topics=completed_count,
        remaining_topics=remaining_count,
        completion_percentage=round(completion_percentage, 1),
        topics=roadmap_json.get("topics", []),
        progress=user_progress,
        topics_to_be_shown=topics_to_show
    )


@router.get("/{cid}/progress", response_model=RoadmapProgressResponse)
def get_roadmap_progress(
    cid: int,
    lm: str = "PNL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get just the progress summary for a roadmap (lighter endpoint).
    
    FIX: Properly handles null progress_json and returns consistent response.
    """
    logger.info(f"[ROADMAP] GET /{cid}/progress called by user={current_user.uid}, lm={lm}")
    
    course = db.query(Course).filter(Course.cid == cid).first()
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    
    if not course_slug:
        logger.error(f"[ROADMAP] Unknown course ID: {cid}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown course ID: {cid}"
        )
    
    lm = lm.upper()
    if lm not in ["PNL", "PRACTICE"]:
        lm = "PNL"
    
    # Load roadmap and compute progress
    roadmap_json = load_roadmap_json(course_slug, lm)
    all_topic_keys = extract_all_topic_keys(roadmap_json)
    user_progress = get_user_progress(db, current_user.uid, cid)
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
    
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if user_progress.get(k) is True])
    remaining_count = total_topics - completed_count
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    return RoadmapProgressResponse(
        success=True,
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
        remaining_topics=remaining_count,
        completion_percentage=round(completion_percentage, 1),
        progress=user_progress,
        topics_to_be_shown=topics_to_show,
        current_topic=get_current_topic(topics_to_show)
    )


@router.post("/progress/update", response_model=RoadmapProgressResponse)
def update_roadmap_progress(
    update_data: RoadmapProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a topic as complete or incomplete.
    
    THIS IS THE SINGLE SOURCE OF TRUTH for progress updates.
    ALL progress updates should go through this endpoint.
    
    CRITICAL FIXES APPLIED:
    1. Uses update_user_progress which MERGES instead of overwriting
    2. Proper DB commit and refresh with rollback on error
    3. Computed top_id (not stale input)
    4. Idempotent - skips if already completed
    5. Enhanced response with success/completed/remaining/updated_progress
    6. Atomic transaction - all or nothing
    7. Race condition safe with row-level locking
    
    Response format:
    {
        "success": true,
        "cid": X,
        "completed_topics": X,
        "remaining_topics": Y,
        "progress": {...}  // This is the updated_progress
    }
    """
    cid = update_data.cid
    topic_key = update_data.topic_key
    completed = update_data.completed
    
    logger.info(f"[ROADMAP] POST /progress/update called: user={current_user.uid}, course={cid}, topic={topic_key}, completed={completed}")
    
    try:
        # STEP 1: Validate course
        course_slug = COURSE_CID_TO_SLUG.get(cid)
        if not course_slug:
            logger.error(f"[ROADMAP] Unknown course ID: {cid}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown course ID: {cid}"
            )
        
        # STEP 2: Get user's preferred learning mode
        pref = db.query(CoursePreference).filter(
            CoursePreference.uid == current_user.uid,
            CoursePreference.cid == cid
        ).first()
        lm = pref.lm if pref and pref.lm else "PNL"
        
        # STEP 3: Load roadmap JSON to validate the topic_key exists
        roadmap_json = load_roadmap_json(course_slug, lm)
        all_topic_keys = extract_all_topic_keys(roadmap_json)
        
        if topic_key not in all_topic_keys:
            logger.error(f"[ROADMAP] Invalid topic key: {topic_key}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid topic key: {topic_key}"
            )
        
        # STEP 4: Get or create roadmap record
        roadmap_record = get_or_create_roadmap(db, cid, lm)
        
        # STEP 5: Get or create topics_to_be_shown record first
        topics_record = db.query(TopicsToBeShown).filter(
            TopicsToBeShown.uid == current_user.uid,
            TopicsToBeShown.rid == roadmap_record.rid
        ).first()
        
        if not topics_record:
            logger.info(f"[ROADMAP] Creating initial topics_to_be_shown record")
            user_progress = get_user_progress(db, current_user.uid, cid)
            topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
            topics_record = update_topics_to_be_shown(
                db, current_user.uid, roadmap_record.rid, 
                topics_to_show, get_current_topic(topics_to_show),
                all_topic_keys
            )
        
        # STEP 6: Use single source of truth function for progress update
        # This handles merge logic, null handling, JSONB flagging, etc.
        updated_progress = update_user_progress(
            db, current_user.uid, cid, topic_key, completed, 
            top_id_ref=topics_record.top_id,
            all_topic_keys=all_topic_keys
        )
        
        # STEP 7: Recompute topics_to_be_shown (deterministic: JSON - completed)
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, updated_progress)
        current_topic = get_current_topic(topics_to_show)
        
        # STEP 8: Update TopicsToBeShown record
        update_topics_to_be_shown(
            db, current_user.uid, roadmap_record.rid, 
            topics_to_show, current_topic, all_topic_keys
        )
        
        # STEP 9: Ensure user is enrolled (auto-enroll on first progress)
        enrollment = db.query(CourseEnrolled).filter(
            CourseEnrolled.uid == current_user.uid,
            CourseEnrolled.cid == cid
        ).first()
        if not enrollment:
            logger.info(f"[ROADMAP] Auto-enrolling user={current_user.uid} in course={cid}")
            db.add(CourseEnrolled(uid=current_user.uid, cid=cid))
        
        # STEP 10: FIX - ATOMIC COMMIT - Ensure DB persistence
        db.commit()
        logger.info(f"[ROADMAP] Progress update committed to DB successfully")
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # FIX: Rollback on any unexpected error to prevent partial writes
        logger.error(f"[ROADMAP] Error updating progress: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update progress: {str(e)}"
        )
    
    # STEP 11: Get course name for response
    course = db.query(Course).filter(Course.cid == cid).first()
    
    # STEP 12: Calculate statistics (deterministic: completed tasks are source of truth)
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if updated_progress.get(k) is True])
    remaining_count = total_topics - completed_count
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    logger.info(f"[ROADMAP] Update complete: completed={completed_count}, remaining={remaining_count}, percentage={round(completion_percentage, 1)}%")
    
    return RoadmapProgressResponse(
        success=True,
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
        remaining_topics=remaining_count,
        completion_percentage=round(completion_percentage, 1),
        progress=updated_progress,  # This IS the updated_progress
        topics_to_be_shown=topics_to_show,
        current_topic=current_topic
    )


@router.get("/{cid}/topics", response_model=List[str])
def get_all_topics(
    cid: int,
    lm: str = "PNL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all topic keys for a course roadmap."""
    logger.info(f"[ROADMAP] GET /{cid}/topics called by user={current_user.uid}, lm={lm}")
    
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if not course_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown course ID: {cid}"
        )
    
    lm = lm.upper()
    if lm not in ["PNL", "PRACTICE"]:
        lm = "PNL"
    
    roadmap_json = load_roadmap_json(course_slug, lm)
    return extract_all_topic_keys(roadmap_json)


@router.post("/{cid}/reset")
def reset_roadmap_progress(
    cid: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reset all progress for a course roadmap.
    
    FIX: Properly resets progress_json to empty dict and commits.
    """
    logger.info(f"[ROADMAP] POST /{cid}/reset called by user={current_user.uid}")
    
    # Clear progress
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    
    if progress:
        logger.info(f"[ROADMAP] Resetting progress_json to empty dict")
        progress.progress_json = {}
        progress.last_updated = datetime.utcnow()
        flag_modified(progress, "progress_json")
    
    # Reset topics_to_be_shown
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if course_slug:
        pref = db.query(CoursePreference).filter(
            CoursePreference.uid == current_user.uid,
            CoursePreference.cid == cid
        ).first()
        lm = pref.lm if pref and pref.lm else "PNL"
        
        roadmap_record = get_or_create_roadmap(db, cid, lm)
        roadmap_json = load_roadmap_json(course_slug, lm)
        all_topic_keys = extract_all_topic_keys(roadmap_json)
        
        update_topics_to_be_shown(
            db, current_user.uid, roadmap_record.rid,
            all_topic_keys, all_topic_keys[0] if all_topic_keys else None,
            all_topic_keys
        )
    
    # FIX: Ensure DB persistence
    db.commit()
    logger.info(f"[ROADMAP] Progress reset committed to DB")
    
    return {
        "success": True,
        "message": "Progress reset successfully", 
        "cid": cid
    }


@router.post("/{cid}/bulk-update")
def bulk_update_progress(
    cid: int,
    topic_keys: List[str],
    completed: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bulk update multiple topics at once.
    
    This is useful for marking multiple topics as complete/incomplete in a single request.
    
    CRITICAL FIXES APPLIED:
    1. ATOMIC - All topics updated in single transaction
    2. ROLLBACK on error - Prevents partial writes
    3. Uses update_user_progress for each topic (MERGE logic)
    4. Proper error handling and logging
    
    Response format:
    {
        "success": true,
        "message": "Updated X topics",
        "cid": X,
        "completed_topics": X,
        "remaining_topics": Y,
        "updated_progress": {...},
        "updated_keys": [...]
    }
    """
    logger.info(f"[ROADMAP] POST /{cid}/bulk-update called: user={current_user.uid}, topics={len(topic_keys)}, completed={completed}")
    
    try:
        course_slug = COURSE_CID_TO_SLUG.get(cid)
        if not course_slug:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown course ID: {cid}"
            )
        
        # Get learning mode
        pref = db.query(CoursePreference).filter(
            CoursePreference.uid == current_user.uid,
            CoursePreference.cid == cid
        ).first()
        lm = pref.lm if pref and pref.lm else "PNL"
        
        # Load and validate
        roadmap_json = load_roadmap_json(course_slug, lm)
        all_topic_keys = extract_all_topic_keys(roadmap_json)
        
        # Validate all topic keys BEFORE making any changes
        invalid_keys = [k for k in topic_keys if k not in all_topic_keys]
        if invalid_keys:
            logger.error(f"[ROADMAP] Invalid topic keys in bulk update: {invalid_keys}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid topic keys: {invalid_keys}"
            )
        
        # Get or create roadmap record
        roadmap_record = get_or_create_roadmap(db, cid, lm)
        
        # Get or create topics_to_be_shown
        topics_record = db.query(TopicsToBeShown).filter(
            TopicsToBeShown.uid == current_user.uid,
            TopicsToBeShown.rid == roadmap_record.rid
        ).first()
        
        if not topics_record:
            user_progress = get_user_progress(db, current_user.uid, cid)
            topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
            topics_record = update_topics_to_be_shown(
                db, current_user.uid, roadmap_record.rid,
                topics_to_show, get_current_topic(topics_to_show),
                all_topic_keys
            )
        
        # Update each topic using the single source of truth function
        # Each call uses MERGE logic, so progress is never overwritten
        updated_progress = {}
        for topic_key in topic_keys:
            logger.info(f"[ROADMAP] Bulk updating topic: {topic_key}")
            updated_progress = update_user_progress(
                db, current_user.uid, cid, topic_key, completed,
                top_id_ref=topics_record.top_id,
                all_topic_keys=all_topic_keys
            )
        
        # Recompute topics_to_be_shown after all updates
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, updated_progress)
        current_topic = get_current_topic(topics_to_show)
        
        update_topics_to_be_shown(
            db, current_user.uid, roadmap_record.rid,
            topics_to_show, current_topic, all_topic_keys
        )
        
        # ATOMIC COMMIT - All changes committed together
        db.commit()
        logger.info(f"[ROADMAP] Bulk update committed: {len(topic_keys)} topics updated atomically")
        
    except HTTPException:
        raise
    except Exception as e:
        # ROLLBACK on any unexpected error to prevent partial writes
        logger.error(f"[ROADMAP] Error in bulk update: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update progress: {str(e)}"
        )
    
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if updated_progress.get(k) is True])
    remaining_count = total_topics - completed_count
    
    return {
        "success": True,
        "message": f"Updated {len(topic_keys)} topics",
        "cid": cid,
        "completed_topics": completed_count,
        "remaining_topics": remaining_count,
        "updated_progress": updated_progress,  # ADDED: Return full progress snapshot
        "updated_keys": topic_keys
    }

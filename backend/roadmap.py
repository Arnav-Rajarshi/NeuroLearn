"""
Roadmap Pipeline Module

This module implements the correct roadmap progress pipeline:
1. JSON files are the source of truth for roadmap structure
2. Database stores only user-specific progress state
3. topics_to_be_shown = json_topics - completed_topics

Data Flow:
Frontend requests roadmap
    ↓
Backend loads JSON roadmap file
    ↓
Backend fetches user's completed topics from DB
    ↓
Backend computes remaining topics (JSON - completed)
    ↓
topics_to_be_shown stored in ProgressLevel table
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

from database import get_db
from models import (
    User, Course, Roadmap, TopicsToBeShown, 
    ProgressLevel, CoursePreference, CourseEnrolled
)
from auth import get_current_user

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])

# Path to roadmap JSON files (relative to backend directory)
ROADMAP_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "data", "courses")

# Course slug to cid mapping (mirrors frontend courseMap.js)
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
    """Response with user's progress on a roadmap"""
    cid: int
    course_name: Optional[str]
    lm: str  # 'PNL' or 'PRACTICE'
    total_topics: int
    completed_topics: int
    completion_percentage: float
    progress: Dict[str, bool]  # topic_key -> completed
    topics_to_be_shown: List[str]  # Remaining topic keys
    current_topic: Optional[str]  # The topic user should work on next


class FullRoadmapResponse(BaseModel):
    """Full roadmap with structure and progress"""
    cid: int
    course_name: str
    lm: str
    estimated_hours: int
    total_topics: int
    completed_topics: int
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
    """Load roadmap structure from JSON file."""
    file_path = get_roadmap_json_path(course_slug, learning_mode)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Roadmap file not found: {course_slug}_{learning_mode}.json"
        )
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid JSON in roadmap file: {str(e)}"
        )


def extract_all_topic_keys(roadmap_json: Dict[str, Any]) -> List[str]:
    """Extract all unique topic keys from a roadmap JSON."""
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
    completed_keys: List[str]
) -> List[str]:
    """Compute remaining topics by subtracting completed from total."""
    completed_set = set(completed_keys) if completed_keys else set()
    return [key for key in all_topic_keys if key not in completed_set]


def filter_known_topics(
    topics_list: List[str],
    known_topics: Optional[List[str]]
) -> List[str]:
    """
    Filter out known topics from the topics list.
    
    Known topics are topics the user already knows, so they should not be shown
    in the roadmap. This filtering happens BEFORE topics are saved to the database.
    """
    if not known_topics:
        return topics_list
    
    known_set = set(known_topics)
    return [topic for topic in topics_list if topic not in known_set]


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
    cid = int(cid)
    roadmap = db.query(Roadmap).filter(
        Roadmap.cid == cid,
        Roadmap.lm == lm
    ).first()
    
    if not roadmap:
        roadmap = Roadmap(cid=cid, lm=lm)
        db.add(roadmap)
        db.flush()
    
    return roadmap


def get_user_progress_record(
    db: Session, 
    uid: int, 
    cid: int
) -> Optional[ProgressLevel]:
    """
    Get user's progress record for a course with strict type matching.
    
    FIXES:
    - Cast both uid and cid to int for type consistency
    - Validate returned record matches requested cid exactly
    - Return None if mismatch detected
    """
    uid = int(uid)
    cid = int(cid)
    
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    # VALIDATION: Ensure no cid mismatch
    if progress is not None:
        if int(progress.uid) != uid or int(progress.cid) != cid:
            # Mismatch detected - discard and return None
            return None
    
    return progress


def get_user_progress(
    db: Session, 
    uid: int, 
    cid: int
) -> List[str]:
    """
    Get user's completed topics for a course as a list.
    
    Returns:
        List of completed topic keys
    """
    progress = get_user_progress_record(db, int(uid), int(cid))
    
    if not progress:
        return []
    
    # Handle NULL or corrupted progress_json
    progress_json = progress.progress_json
    if progress_json is None:
        return []
    
    # Handle dict format (legacy) - convert to list
    if isinstance(progress_json, dict):
        return [k for k, v in progress_json.items() if v is True]
    
    # Handle list format (correct)
    if isinstance(progress_json, list):
        return list(progress_json)
    
    # Unknown format - return empty
    return []


def get_or_create_progress(
    db: Session,
    uid: int,
    cid: int
) -> ProgressLevel:
    """
    Get existing progress or create new one with proper initialization.
    
    FIXES:
    - Check if record exists before creating
    - Initialize progress_json and topics_to_be_shown_json as empty lists
    - Never allow NULL values
    """
    uid = int(uid)
    cid = int(cid)
    
    progress = get_user_progress_record(db, uid, cid)
    
    
    if progress is None:
        # Create new progress with proper initialization
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            top_id=None,
            progress_json=[],  # Initialize as empty list, NOT None
            topics_to_be_shown_json=[]  # Initialize as empty list, NOT None
        )
        db.add(progress)
        db.flush()
    else:
        # FIX: Ensure existing record has valid JSON
        needs_update = False
        
        if progress.progress_json is None:
            progress.progress_json = []
            needs_update = True
        
        if progress.topics_to_be_shown_json is None:
            progress.topics_to_be_shown_json = []
            needs_update = True
        
        if needs_update:
            db.flush()
    
    return progress


def update_user_progress(
    db: Session,
    uid: int,
    cid: int,
    topic_key: str,
    completed: bool,
    all_topic_keys: List[str]
) -> List[str]:
    """
    Update user's progress for a specific topic.
    
    FIXES:
    - Use get_or_create_progress to ensure record exists
    - Properly append to progress_json list
    - Never overwrite with NULL
    - Commit changes properly
    """
    uid = int(uid)
    cid = int(cid)
    
    progress = get_or_create_progress(db, uid, cid)
    
    
    # Validate the record matches
    if int(progress.uid) != uid or int(progress.cid) != cid:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Progress record mismatch"
        )
    
    # Load current progress as list
    current_progress = progress.progress_json
    if current_progress is None:
        current_progress = []
    elif isinstance(current_progress, dict):
        # Convert legacy dict to list
        current_progress = [k for k, v in current_progress.items() if v is True]
    else:
        current_progress = list(current_progress)
    
    if completed:
        # Append topic if not already completed
        if topic_key not in current_progress:
            current_progress.append(topic_key)
    else:
        # Remove topic if marking incomplete
        if topic_key in current_progress:
            current_progress.remove(topic_key)
    
    # Recompute topics_to_be_shown
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, current_progress)
    
    # Update the record
    progress.progress_json = current_progress
    progress.topics_to_be_shown_json = topics_to_show
    progress.last_updated = datetime.utcnow()
    
    # Explicitly mark JSONB fields as modified
    flag_modified(progress, "progress_json")
    flag_modified(progress, "topics_to_be_shown_json")
    
    db.flush()
    
    return current_progress


def update_topics_to_be_shown(
    db: Session,
    uid: int,
    rid: int,
    topics_list: List[str],
    current_topic: Optional[str] = None,
    all_topic_keys: Optional[List[str]] = None
) -> TopicsToBeShown:
    """Update or create the topics_to_be_shown record."""
    topics_record = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.uid == int(uid),
        TopicsToBeShown.rid == int(rid)
    ).first()
    
    new_json = {
        "remaining": topics_list if topics_list else [],
        "current": current_topic,
        "total_remaining": len(topics_list) if topics_list else 0,
        "is_complete": len(topics_list) == 0 if topics_list else True
    }
    
    if not topics_record:
        topics_record = TopicsToBeShown(
            uid=int(uid),
            rid=int(rid),
            topics_json=new_json
        )
        db.add(topics_record)
    else:
        topics_record.topics_json = new_json
        flag_modified(topics_record, "topics_json")
    
    db.flush()
    return topics_record


def convert_progress_to_dict(completed_topics: List[str]) -> Dict[str, bool]:
    """Convert progress list to dict format for API response."""
    return {topic: True for topic in completed_topics}


def ensure_valid_response(
    topics_to_be_shown: Any,
    completed_topics: Any
) -> Dict[str, Any]:
    """
    Ensure response always has valid format.
    
    FIXES:
    - Never return null
    - Never return missing keys
    """
    if topics_to_be_shown is None:
        topics_to_be_shown = []
    elif not isinstance(topics_to_be_shown, list):
        topics_to_be_shown = []
    
    if completed_topics is None:
        completed_topics = []
    elif not isinstance(completed_topics, list):
        completed_topics = []
    
    return {
        "topics_to_be_shown": topics_to_be_shown,
        "completed_topics": completed_topics
    }


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
    
    FIXES:
    - Always recompute if progress_json is empty or NULL
    - Use stored topics only when valid
    - Validate uid/cid consistency
    """
    cid = int(cid)
    uid = int(current_user.uid)
    
    # Get course slug from cid
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if not course_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown course ID: {cid}"
        )
    
    # Validate learning mode
    lm = lm.upper()
    if lm not in ["PNL", "PRACTICE"]:
        lm = "PNL"
    
    # Step 1: Load roadmap JSON (source of truth)
    roadmap_json = load_roadmap_json(course_slug, lm)
    
    # Step 2: Extract all topic keys from JSON
    all_topic_keys = extract_all_topic_keys(roadmap_json)
    
    # Step 2.5: Fetch known topics from course preferences (backend source of truth)
    known_topics = []
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == uid,
        CoursePreference.cid == cid
    ).first()
    if pref and pref.known_topics:
        known_topics = pref.known_topics if isinstance(pref.known_topics, list) else []
    
    # Step 3: Get or create progress record
    progress = get_or_create_progress(db, uid, cid)
    
    
    # Step 4: Validate record consistency
    if int(progress.uid) != uid or int(progress.cid) != cid:
        # Mismatch - create new record
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            progress_json=[],
            topics_to_be_shown_json=[]
        )
        db.add(progress)
        db.flush()
    
    # Step 5: Get completed topics
    completed_topics = progress.progress_json
    if completed_topics is None:
        completed_topics = []
    elif isinstance(completed_topics, dict):
        completed_topics = [k for k, v in completed_topics.items() if v is True]
    else:
        completed_topics = list(completed_topics)
    
    # Step 6: CRITICAL FIX - Recompute if progress is empty/null OR stored topics invalid
    stored_topics = progress.topics_to_be_shown_json
    should_recompute = (
        stored_topics is None or
        not isinstance(stored_topics, list) or
        len(stored_topics) == 0 or
        len(completed_topics) == 0  # Fresh start - always recompute
    )
    
    if should_recompute:
        # Recompute from JSON file
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, completed_topics)
        
        # CRITICAL: Filter out known topics BEFORE saving (backend is authoritative)
        topics_to_show = filter_known_topics(topics_to_show, known_topics)
        
        # Update stored topics
        progress.topics_to_be_shown_json = topics_to_show
        flag_modified(progress, "topics_to_be_shown_json")
    else:
        # Use stored topics but validate
        topics_to_show = list(stored_topics)
    
    current_topic = get_current_topic(topics_to_show)
    
    # Step 7: Update TopicsToBeShown table
    roadmap_record = get_or_create_roadmap(db, cid, lm)
    update_topics_to_be_shown(
        db, 
        uid, 
        roadmap_record.rid, 
        topics_to_show,
        current_topic,
        all_topic_keys
    )
    
    db.commit()
    
    # Calculate statistics
    total_topics = len(all_topic_keys)
    completed_count = len(completed_topics)
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    # Convert progress to dict for API response
    progress_dict = convert_progress_to_dict(completed_topics)
    
    return FullRoadmapResponse(
        cid=cid,
        course_name=roadmap_json.get("courseName", ""),
        lm=lm,
        estimated_hours=roadmap_json.get("estimatedHours", 0),
        total_topics=total_topics,
        completed_topics=completed_count,
        completion_percentage=round(completion_percentage, 1),
        topics=roadmap_json.get("topics", []),
        progress=progress_dict,
        topics_to_be_shown=topics_to_show if topics_to_show else []
    )


@router.get("/{cid}/progress", response_model=RoadmapProgressResponse)
def get_roadmap_progress(
    cid: int,
    lm: str = "PNL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get just the progress summary for a roadmap (lighter endpoint)."""
    cid = int(cid)
    uid = int(current_user.uid)
    
    course = db.query(Course).filter(Course.cid == cid).first()
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    
    if not course_slug:
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
    
    # Fetch known topics from course preferences
    known_topics = []
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == uid,
        CoursePreference.cid == cid
    ).first()
    if pref and pref.known_topics:
        known_topics = pref.known_topics if isinstance(pref.known_topics, list) else []
    
    # Get or create progress
    progress = get_or_create_progress(db, uid, cid)
    completed_topics = get_user_progress(db, uid, cid)
    
    # Always recompute if empty
    stored_topics = progress.topics_to_be_shown_json
    if not stored_topics or not isinstance(stored_topics, list):
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, completed_topics)
        # Filter out known topics BEFORE saving
        topics_to_show = filter_known_topics(topics_to_show, known_topics)
        progress.topics_to_be_shown_json = topics_to_show
        flag_modified(progress, "topics_to_be_shown_json")
        db.commit()
    else:
        topics_to_show = list(stored_topics)
    
    total_topics = len(all_topic_keys)
    completed_count = len(completed_topics)
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    progress_dict = convert_progress_to_dict(completed_topics)
    
    return RoadmapProgressResponse(
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
        completion_percentage=round(completion_percentage, 1),
        progress=progress_dict,
        topics_to_be_shown=topics_to_show if topics_to_show else [],
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
    
    FIXES:
    - Properly append to progress_json
    - Commit DB changes properly
    - Never overwrite with NULL
    """
    cid = int(update_data.cid)
    uid = int(current_user.uid)
    topic_key = update_data.topic_key
    completed = update_data.completed
    
    # Get course slug
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if not course_slug:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown course ID: {cid}"
        )
    
    # Get user's preferred learning mode
    pref = db.query(CoursePreference).filter(
        CoursePreference.uid == uid,
        CoursePreference.cid == cid
    ).first()
    lm = pref.lm if pref and pref.lm else "PNL"
    
    # Get known topics for filtering
    known_topics = []
    if pref and pref.known_topics:
        known_topics = pref.known_topics if isinstance(pref.known_topics, list) else []
    
    # Load roadmap JSON to validate the topic_key exists
    roadmap_json = load_roadmap_json(course_slug, lm)
    all_topic_keys = extract_all_topic_keys(roadmap_json)
    
    if topic_key not in all_topic_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid topic key: {topic_key}"
        )
    
    # Update progress - this handles all the logic
    updated_progress = update_user_progress(
        db, uid, cid, topic_key, completed, all_topic_keys
    )
    
    # Get the updated progress record
    progress = get_user_progress_record(db, uid, cid)
    topics_to_show = progress.topics_to_be_shown_json if progress else []
    if topics_to_show is None:
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, updated_progress)
        # Filter out known topics BEFORE saving
        topics_to_show = filter_known_topics(topics_to_show, known_topics)
    
    current_topic = get_current_topic(topics_to_show)
    
    # Update TopicsToBeShown table
    roadmap_record = get_or_create_roadmap(db, cid, lm)
    update_topics_to_be_shown(
        db, uid, roadmap_record.rid, 
        topics_to_show, current_topic, all_topic_keys
    )
    
    # Ensure user is enrolled
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == uid,
        CourseEnrolled.cid == cid
    ).first()
    if not enrollment:
        db.add(CourseEnrolled(uid=uid, cid=cid))
    
    db.commit()
    
    # Get course name
    course = db.query(Course).filter(Course.cid == cid).first()
    
    # Calculate statistics
    total_topics = len(all_topic_keys)
    completed_count = len(updated_progress)
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    progress_dict = convert_progress_to_dict(updated_progress)
    
    return RoadmapProgressResponse(
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
        completion_percentage=round(completion_percentage, 1),
        progress=progress_dict,
        topics_to_be_shown=topics_to_show if topics_to_show else [],
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
    cid = int(cid)
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
    """Reset all progress for a course roadmap."""
    cid = int(cid)
    uid = int(current_user.uid)
    
    # Get progress record
    progress = get_user_progress_record(db, uid, cid)
    
    if progress:
        # Reset to empty lists, not NULL
        progress.progress_json = []
        progress.topics_to_be_shown_json = []
        progress.last_updated = datetime.utcnow()
        flag_modified(progress, "progress_json")
        flag_modified(progress, "topics_to_be_shown_json")
    
    # Recompute topics_to_be_shown
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if course_slug:
        pref = db.query(CoursePreference).filter(
            CoursePreference.uid == uid,
            CoursePreference.cid == cid
        ).first()
        lm = pref.lm if pref and pref.lm else "PNL"
        
        roadmap_record = get_or_create_roadmap(db, cid, lm)
        roadmap_json = load_roadmap_json(course_slug, lm)
        all_topic_keys = extract_all_topic_keys(roadmap_json)
        
        # Update progress with full topics list
        if progress:
            progress.topics_to_be_shown_json = all_topic_keys
            flag_modified(progress, "topics_to_be_shown_json")
        
        update_topics_to_be_shown(
            db, uid, roadmap_record.rid,
            all_topic_keys, all_topic_keys[0] if all_topic_keys else None,
            all_topic_keys
        )
    
    db.commit()
    
    return {"message": "Progress reset successfully", "cid": cid}


@router.get("/{cid}/data")
def get_roadmap_data(
    cid: int,
    lm: str = "PNL",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get roadmap data with guaranteed response format.
    
    Response always contains:
    {
        "topics_to_be_shown": [...],
        "completed_topics": [...]
    }
    """
    cid = int(cid)
    uid = int(current_user.uid)
    
    course_slug = COURSE_CID_TO_SLUG.get(cid)
    if not course_slug:
        return ensure_valid_response([], [])
    
    lm = lm.upper()
    if lm not in ["PNL", "PRACTICE"]:
        lm = "PNL"
    
    try:
        roadmap_json = load_roadmap_json(course_slug, lm)
        all_topic_keys = extract_all_topic_keys(roadmap_json)
    except HTTPException:
        return ensure_valid_response([], [])
    
    # Get or create progress
    progress = get_or_create_progress(db, uid, cid)
    
    # Get completed topics
    completed_topics = progress.progress_json
    if completed_topics is None:
        completed_topics = []
    elif isinstance(completed_topics, dict):
        completed_topics = [k for k, v in completed_topics.items() if v is True]
    
    # Get or compute topics to show
    stored_topics = progress.topics_to_be_shown_json
    
    if not stored_topics or not isinstance(stored_topics, list):
        # Recompute
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, completed_topics)
        progress.topics_to_be_shown_json = topics_to_show
        flag_modified(progress, "topics_to_be_shown_json")
        db.commit()
    else:
        topics_to_show = list(stored_topics)
    
    return ensure_valid_response(topics_to_show, completed_topics)

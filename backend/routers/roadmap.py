"""
Roadmap Pipeline Module

This module implements the correct roadmap progress pipeline:
1. JSON files are the source of truth for roadmap structure
2. Database stores only user-specific progress state
3. topics_to_be_shown = json_topics - completed_topics

Data Flow:
Frontend requests roadmap
    |
Backend loads JSON roadmap file
    |
Backend fetches user's completed topics from DB
    |
Backend computes remaining topics (JSON - completed)
    |
topics_to_be_shown stored in TopicsToBeShown table
    |
Filtered roadmap returned to frontend
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import os
import re

from database import get_db
from models.roadmap_models import (
    User, Course, Roadmap, TopicsToBeShown, 
    ProgressLevel, CoursePreference, CourseEnrolled
)
from core.auth import get_current_user

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])

# Path to roadmap JSON files (relative to backend directory)
# In production, these would be served from a CDN or stored in the database
ROADMAP_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "module1", "public", "data", "courses")

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
    """
    Get the path to the roadmap JSON file.
    
    Args:
        course_slug: Course identifier (e.g., "python", "dsa")
        learning_mode: Either "PNL" or "PRACTICE"
    
    Returns:
        Full path to the JSON file
    """
    # Handle special cases for file naming
    if course_slug.upper() == "SQL":
        filename = f"SQL_{learning_mode}.json"
    else:
        filename = f"{course_slug}_{learning_mode}.json"
    
    return os.path.join(ROADMAP_DATA_PATH, filename)


def load_roadmap_json(course_slug: str, learning_mode: str = "PNL") -> Dict[str, Any]:
    """
    Load roadmap structure from JSON file.
    
    Args:
        course_slug: Course identifier (e.g., "python", "dsa")
        learning_mode: Either "PNL" or "PRACTICE"
    
    Returns:
        Parsed JSON roadmap data
    
    Raises:
        HTTPException: If file not found or invalid JSON
    """
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
    """
    Extract all unique topic keys from a roadmap JSON.
    
    Topic keys are formatted as: "topic_name::subtopic_name"
    This creates a flat list of all learnable items.
    
    Args:
        roadmap_json: Parsed roadmap JSON data
    
    Returns:
        List of topic keys in order
    """
    topic_keys = []
    
    topics = roadmap_json.get("topics", [])
    for topic in topics:
        topic_name = topic.get("name", "")
        subtopics = topic.get("subtopics", [])
        
        for subtopic in subtopics:
            subtopic_name = subtopic.get("name", "")
            # Create a unique key combining topic and subtopic
            key = f"{topic_name}::{subtopic_name}"
            topic_keys.append(key)
    
    return topic_keys


def compute_topics_to_be_shown(
    all_topic_keys: List[str], 
    completed_keys: Dict[str, bool]
) -> List[str]:
    """
    Compute remaining topics by subtracting completed from total.
    
    Args:
        all_topic_keys: All topic keys from JSON (source of truth)
        completed_keys: Map of topic_key -> True for completed topics
    
    Returns:
        List of topic keys that are not yet completed
    """
    return [key for key in all_topic_keys if not completed_keys.get(key, False)]


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
    
    Returns:
        Dict mapping topic_key -> True (only completed topics are stored)
    """
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    if not progress or not progress.progress_json:
        return {}
    
    # progress_json stores: {"topic_key": true, ...}
    return progress.progress_json


def update_user_progress(
    db: Session,
    uid: int,
    cid: int,
    topic_key: str,
    completed: bool,
    top_id: Optional[int] = None
) -> Dict[str, bool]:
    """
    Update user's progress for a specific topic.
    
    Args:
        db: Database session
        uid: User ID
        cid: Course ID
        topic_key: The topic to mark as complete/incomplete
        completed: Whether the topic is completed
        top_id: Optional reference to TopicsToBeShown record
    
    Returns:
        Updated progress dictionary
    """
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == uid,
        ProgressLevel.cid == cid
    ).first()
    
    if not progress:
        progress = ProgressLevel(
            uid=uid,
            cid=cid,
            top_id=top_id,
            progress_json={}
        )
        db.add(progress)
    
    # Update the progress JSON
    current_progress = progress.progress_json or {}
    
    if completed:
        current_progress[topic_key] = True
    else:
        # Remove the key if marking as incomplete
        current_progress.pop(topic_key, None)
    
    progress.progress_json = current_progress
    progress.top_id = top_id
    progress.last_updated = datetime.utcnow()
    
    db.flush()
    return current_progress


def update_topics_to_be_shown(
    db: Session,
    uid: int,
    rid: int,
    topics_list: List[str],
    current_topic: Optional[str] = None
) -> TopicsToBeShown:
    """
    Update or create the topics_to_be_shown record.
    
    Args:
        db: Database session
        uid: User ID
        rid: Roadmap ID
        topics_list: List of remaining topic keys
        current_topic: The current topic being shown
    
    Returns:
        Updated TopicsToBeShown record
    """
    topics_record = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.uid == uid,
        TopicsToBeShown.rid == rid
    ).first()
    
    if not topics_record:
        topics_record = TopicsToBeShown(
            uid=uid,
            rid=rid,
            topics_json={
                "remaining": topics_list,
                "current": current_topic,
                "total_remaining": len(topics_list)
            }
        )
        db.add(topics_record)
    else:
        topics_record.topics_json = {
            "remaining": topics_list,
            "current": current_topic,
            "total_remaining": len(topics_list)
        }
    
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
    
    This endpoint:
    1. Loads the roadmap structure from JSON (source of truth)
    2. Fetches user's completed topics from database
    3. Computes topics_to_be_shown (JSON - completed)
    4. Updates the TopicsToBeShown record
    5. Returns the filtered roadmap
    """
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
    
    # Step 3: Get user's completed topics from database
    user_progress = get_user_progress(db, current_user.uid, cid)
    
    # Step 4: Compute topics_to_be_shown
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
    current_topic = get_current_topic(topics_to_show)
    
    # Step 5: Get or create roadmap record and update TopicsToBeShown
    roadmap_record = get_or_create_roadmap(db, cid, lm)
    topics_record = update_topics_to_be_shown(
        db, 
        current_user.uid, 
        roadmap_record.rid, 
        topics_to_show,
        current_topic
    )
    
    # Update the top_id reference in progress if exists
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    if progress:
        progress.top_id = topics_record.top_id
    
    db.commit()
    
    # Calculate statistics
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if user_progress.get(k, False)])
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    return FullRoadmapResponse(
        cid=cid,
        course_name=roadmap_json.get("courseName", ""),
        lm=lm,
        estimated_hours=roadmap_json.get("estimatedHours", 0),
        total_topics=total_topics,
        completed_topics=completed_count,
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
    """
    # Get course info
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
    user_progress = get_user_progress(db, current_user.uid, cid)
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
    
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if user_progress.get(k, False)])
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    return RoadmapProgressResponse(
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
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
    
    This endpoint:
    1. Updates the progress_json in ProgressLevel
    2. Recomputes topics_to_be_shown
    3. Updates the TopicsToBeShown record
    4. Returns updated progress summary
    """
    cid = update_data.cid
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
        CoursePreference.uid == current_user.uid,
        CoursePreference.cid == cid
    ).first()
    lm = pref.lm if pref and pref.lm else "PNL"
    
    # Load roadmap JSON to validate the topic_key exists
    roadmap_json = load_roadmap_json(course_slug, lm)
    all_topic_keys = extract_all_topic_keys(roadmap_json)
    
    if topic_key not in all_topic_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid topic key: {topic_key}"
        )
    
    # Get or create roadmap record
    roadmap_record = get_or_create_roadmap(db, cid, lm)
    
    # Get or create topics_to_be_shown record first
    topics_record = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.uid == current_user.uid,
        TopicsToBeShown.rid == roadmap_record.rid
    ).first()
    
    if not topics_record:
        # Compute initial topics_to_be_shown
        user_progress = get_user_progress(db, current_user.uid, cid)
        topics_to_show = compute_topics_to_be_shown(all_topic_keys, user_progress)
        topics_record = update_topics_to_be_shown(
            db, current_user.uid, roadmap_record.rid, 
            topics_to_show, get_current_topic(topics_to_show)
        )
    
    # Update progress
    updated_progress = update_user_progress(
        db, current_user.uid, cid, topic_key, completed, topics_record.top_id
    )
    
    # Recompute topics_to_be_shown
    topics_to_show = compute_topics_to_be_shown(all_topic_keys, updated_progress)
    current_topic = get_current_topic(topics_to_show)
    
    # Update TopicsToBeShown record
    update_topics_to_be_shown(
        db, current_user.uid, roadmap_record.rid, 
        topics_to_show, current_topic
    )
    
    # Ensure user is enrolled
    enrollment = db.query(CourseEnrolled).filter(
        CourseEnrolled.uid == current_user.uid,
        CourseEnrolled.cid == cid
    ).first()
    if not enrollment:
        db.add(CourseEnrolled(uid=current_user.uid, cid=cid))
    
    db.commit()
    
    # Get course name
    course = db.query(Course).filter(Course.cid == cid).first()
    
    # Calculate statistics
    total_topics = len(all_topic_keys)
    completed_count = len([k for k in all_topic_keys if updated_progress.get(k, False)])
    completion_percentage = (completed_count / total_topics * 100) if total_topics > 0 else 0
    
    return RoadmapProgressResponse(
        cid=cid,
        course_name=course.course_name if course else None,
        lm=lm,
        total_topics=total_topics,
        completed_topics=completed_count,
        completion_percentage=round(completion_percentage, 1),
        progress=updated_progress,
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
    """
    Get all topic keys for a course roadmap.
    
    Returns the flat list of all topic::subtopic keys from the JSON.
    """
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
    """
    # Clear progress
    progress = db.query(ProgressLevel).filter(
        ProgressLevel.uid == current_user.uid,
        ProgressLevel.cid == cid
    ).first()
    
    if progress:
        progress.progress_json = {}
        progress.last_updated = datetime.utcnow()
    
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
            all_topic_keys, all_topic_keys[0] if all_topic_keys else None
        )
    
    db.commit()
    
    return {"message": "Progress reset successfully", "cid": cid}

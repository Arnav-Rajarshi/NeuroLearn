"""
Progress Utilities Module

Shared utility functions for progress management across the application.
This module provides a SINGLE SOURCE OF TRUTH for progress-related operations.

CRITICAL DESIGN DECISIONS:
1. All progress updates MUST use merge logic (never overwrite)
2. All null progress_json MUST be handled (old user compatibility)
3. All DB writes MUST be committed properly
4. All operations MUST be logged for debugging
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
import logging

from models import ProgressLevel, TopicsToBeShown

# Configure logging
logger = logging.getLogger(__name__)


def ensure_progress_json_valid(progress_json: Any) -> Dict[str, Any]:
    """
    Ensure progress_json is a valid dictionary.
    
    Handles:
    - None values (old users)
    - Invalid types
    - Empty values
    
    Returns:
        Valid dictionary (empty dict if input is invalid)
    """
    if progress_json is None:
        return {}
    if not isinstance(progress_json, dict):
        logger.warning(f"[UTILS] progress_json is not a dict: {type(progress_json)}, returning empty dict")
        return {}
    return dict(progress_json)


def merge_progress_deep(
    existing: Dict[str, Any], 
    new_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Deep merge progress data without losing existing entries.
    
    CRITICAL: This function NEVER overwrites existing progress.
    It only adds new entries or updates existing ones.
    
    Merge strategy:
    - For boolean values: new value wins (to allow marking incomplete)
    - For dict values: recursive merge
    - For list values: extend without duplicates
    - For other values: new value wins
    
    Args:
        existing: Current progress data from database
        new_data: New progress data to merge
    
    Returns:
        Merged progress dictionary
    """
    result = dict(existing or {})
    
    for key, new_value in (new_data or {}).items():
        existing_value = result.get(key)
        
        if isinstance(new_value, dict) and isinstance(existing_value, dict):
            # Recursive merge for nested dicts
            result[key] = merge_progress_deep(existing_value, new_value)
        elif isinstance(new_value, list) and isinstance(existing_value, list):
            # Extend lists without duplicates
            merged_list = list(existing_value)
            for item in new_value:
                if item not in merged_list:
                    merged_list.append(item)
            result[key] = merged_list
        else:
            # Direct assignment for primitives and new keys
            result[key] = new_value
    
    return result


def count_completed_from_progress(
    progress_json: Dict[str, Any],
    all_topic_keys: Optional[List[str]] = None
) -> int:
    """
    Count completed topics from progress_json.
    
    Source of truth: Only counts topics where value is True.
    
    Args:
        progress_json: The progress dictionary
        all_topic_keys: Optional list of valid topic keys to filter against
    
    Returns:
        Number of completed topics
    """
    if not progress_json:
        return 0
    
    count = 0
    for key, value in progress_json.items():
        # Only count if value is explicitly True
        if value is True:
            # If all_topic_keys provided, only count valid keys
            if all_topic_keys is None or key in all_topic_keys:
                count += 1
    
    return count


def get_remaining_topics(
    all_topic_keys: List[str],
    completed_progress: Dict[str, bool]
) -> List[str]:
    """
    Calculate remaining topics deterministically.
    
    Formula: remaining = all_topics - completed_topics
    
    Args:
        all_topic_keys: All topic keys from the roadmap JSON
        completed_progress: Dict mapping topic_key -> True for completed
    
    Returns:
        List of topic keys that are not yet completed
    """
    return [
        key for key in all_topic_keys 
        if completed_progress.get(key) is not True
    ]


def compute_completion_stats(
    all_topic_keys: List[str],
    progress_json: Dict[str, bool]
) -> Dict[str, Any]:
    """
    Compute completion statistics deterministically.
    
    Returns:
        Dict with total_topics, completed_topics, remaining_topics, 
        completion_percentage, topics_to_be_shown
    """
    total = len(all_topic_keys)
    completed = count_completed_from_progress(progress_json, all_topic_keys)
    remaining = total - completed
    percentage = (completed / total * 100) if total > 0 else 0
    remaining_keys = get_remaining_topics(all_topic_keys, progress_json)
    
    return {
        "total_topics": total,
        "completed_topics": completed,
        "remaining_topics": remaining,
        "completion_percentage": round(percentage, 1),
        "topics_to_be_shown": remaining_keys,
        "current_topic": remaining_keys[0] if remaining_keys else None,
        "is_complete": remaining == 0
    }


def safe_update_progress_record(
    db: Session,
    progress: ProgressLevel,
    new_data: Dict[str, Any],
    top_id: Optional[int] = None
) -> ProgressLevel:
    """
    Safely update a progress record with proper merge and commit.
    
    This is the SINGLE SOURCE OF TRUTH for updating ProgressLevel records.
    
    CRITICAL: 
    - Uses merge logic (never overwrites)
    - Handles null progress_json
    - Marks JSONB as modified
    - Does NOT commit (caller must commit)
    
    Args:
        db: Database session
        progress: The ProgressLevel record to update
        new_data: New progress data to merge
        top_id: Optional top_id reference to set
    
    Returns:
        Updated ProgressLevel record
    """
    # Ensure existing data is valid
    existing_data = ensure_progress_json_valid(progress.progress_json)
    
    # Merge new data into existing
    merged_data = merge_progress_deep(existing_data, new_data)
    
    # Update the record
    progress.progress_json = merged_data
    if top_id is not None:
        progress.top_id = top_id
    progress.last_updated = datetime.utcnow()
    
    # Mark as modified for SQLAlchemy JSONB detection
    flag_modified(progress, "progress_json")
    
    # Flush to DB (caller must commit)
    db.flush()
    
    logger.info(f"[UTILS] Updated progress for user={progress.uid}, course={progress.cid}")
    
    return progress


def create_progress_response(
    progress: ProgressLevel,
    course_name: Optional[str] = None,
    all_topic_keys: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Create a standardized progress response.
    
    Ensures consistent response format across all endpoints.
    
    Returns:
        Dict with success, progress_id, uid, cid, progress_json,
        completed_topics, remaining_topics, etc.
    """
    progress_json = ensure_progress_json_valid(progress.progress_json)
    
    # Calculate stats if topic keys provided
    if all_topic_keys:
        stats = compute_completion_stats(all_topic_keys, progress_json)
    else:
        stats = {
            "total_topics": 0,
            "completed_topics": count_completed_from_progress(progress_json),
            "remaining_topics": 0,
            "completion_percentage": 0,
            "topics_to_be_shown": [],
            "current_topic": None,
            "is_complete": False
        }
    
    return {
        "success": True,
        "progress_id": progress.progress_id,
        "uid": progress.uid,
        "cid": progress.cid,
        "course_name": course_name,
        "top_id": progress.top_id,
        "progress_json": progress_json,
        "last_updated": progress.last_updated.isoformat() if progress.last_updated else None,
        **stats
    }


def validate_topic_key(topic_key: str, all_topic_keys: List[str]) -> bool:
    """
    Validate that a topic key exists in the roadmap.
    
    Args:
        topic_key: The topic key to validate
        all_topic_keys: List of all valid topic keys
    
    Returns:
        True if valid, False otherwise
    """
    return topic_key in all_topic_keys


def batch_validate_topic_keys(
    topic_keys: List[str], 
    all_topic_keys: List[str]
) -> tuple[List[str], List[str]]:
    """
    Validate multiple topic keys at once.
    
    Returns:
        Tuple of (valid_keys, invalid_keys)
    """
    valid = []
    invalid = []
    
    for key in topic_keys:
        if key in all_topic_keys:
            valid.append(key)
        else:
            invalid.append(key)
    
    return valid, invalid

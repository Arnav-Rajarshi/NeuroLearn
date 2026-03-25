"""
Centralized Debug Logging System for NeuroLearn Backend

This module provides structured logging for debugging roadmap generation,
progress updates, and data flow issues.

Features:
- File-based logging (debug.log)
- Console logging
- Timestamp + message format
- Auto-clear log file on server restart (optional)
- Structured log messages with clear prefixes

Usage:
    from logger import get_logger
    logger = get_logger(__name__)
    logger.debug_roadmap("GET ROADMAP CALLED", user_id=1, course_id=1)
"""

import logging
import os
import sys
from datetime import datetime
from typing import Any, Optional
from functools import wraps


# ============ Configuration ============

LOG_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(LOG_DIR, "debug.log")
LOG_LEVEL = logging.DEBUG
CLEAR_ON_RESTART = True  # Set to True to clear log file on server restart

# Log format with timestamp, level, module, and message
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


# ============ Initialize Logging ============

def _clear_log_file():
    """Clear the log file on server restart."""
    if CLEAR_ON_RESTART and os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'w') as f:
                f.write(f"=== LOG CLEARED ON SERVER RESTART: {datetime.now().isoformat()} ===\n\n")
        except Exception as e:
            print(f"Warning: Could not clear log file: {e}")


def _setup_root_logger():
    """Set up the root logger with file and console handlers."""
    root_logger = logging.getLogger()
    root_logger.setLevel(LOG_LEVEL)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []
    
    # Create formatter
    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
    
    # File handler - writes to debug.log
    try:
        file_handler = logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8')
        file_handler.setLevel(LOG_LEVEL)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create file handler: {e}")
    
    # Console handler - writes to stdout
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)  # Less verbose on console
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    return root_logger


# Initialize on module import
_clear_log_file()
_root_logger = _setup_root_logger()


# ============ Logger Class with Debug Methods ============

class DebugLogger:
    """
    Enhanced logger with structured debug methods for NeuroLearn.
    
    Provides specific logging methods for:
    - Roadmap fetch/generation
    - Progress updates
    - topics_to_be_shown operations
    - Database commits
    - Function entry/exit
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name
    
    # ============ Standard Logging Methods ============
    
    def debug(self, msg: str, *args, **kwargs):
        self.logger.debug(msg, *args, **kwargs)
    
    def info(self, msg: str, *args, **kwargs):
        self.logger.info(msg, *args, **kwargs)
    
    def warning(self, msg: str, *args, **kwargs):
        self.logger.warning(msg, *args, **kwargs)
    
    def error(self, msg: str, *args, **kwargs):
        self.logger.error(msg, *args, **kwargs)
    
    def critical(self, msg: str, *args, **kwargs):
        self.logger.critical(msg, *args, **kwargs)
    
    # ============ Roadmap Debug Methods ============
    
    def debug_roadmap_fetch(
        self,
        user_id: int,
        course_id: int,
        learning_mode: str = "PNL",
        source: str = "unknown"
    ):
        """Log roadmap fetch operation."""
        self.logger.debug(
            f"\n{'='*60}\n"
            f"[ROADMAP FETCH] ==== GET ROADMAP CALLED ====\n"
            f"  user_id: {user_id}\n"
            f"  course_id: {course_id}\n"
            f"  learning_mode: {learning_mode}\n"
            f"  source: {source}\n"
            f"{'='*60}"
        )
    
    def debug_roadmap_stored_data(
        self,
        user_id: int,
        topics_json: Optional[dict],
        progress_json: Optional[dict]
    ):
        """Log stored data from DB before any computation."""
        topics_count = len(topics_json.get("remaining", [])) if topics_json else "NULL"
        progress_count = len(progress_json) if progress_json else "NULL"
        
        self.logger.debug(
            f"\n[ROADMAP DB DATA]\n"
            f"  user_id: {user_id}\n"
            f"  topics_to_be_shown_json from DB: {topics_count} remaining topics\n"
            f"  progress_json from DB: {progress_count} entries\n"
            f"  topics_json is NULL: {topics_json is None}\n"
            f"  progress_json is NULL: {progress_json is None}"
        )
    
    def debug_roadmap_computation(
        self,
        action: str,  # "ABOUT_TO_COMPUTE" or "COMPUTED"
        user_id: int,
        topics_count: int = 0,
        reason: str = ""
    ):
        """Log before/after topics_to_be_shown computation."""
        if action == "ABOUT_TO_COMPUTE":
            self.logger.warning(
                f"\n[ROADMAP COMPUTATION] *** ABOUT TO COMPUTE topics_to_be_shown ***\n"
                f"  user_id: {user_id}\n"
                f"  reason: {reason}\n"
                f"  WARNING: This should ONLY happen for NEW users!"
            )
        elif action == "COMPUTED":
            self.logger.debug(
                f"\n[ROADMAP COMPUTATION] COMPUTED topics_to_be_shown\n"
                f"  user_id: {user_id}\n"
                f"  result: {topics_count} remaining topics"
            )
        elif action == "SKIPPED":
            self.logger.debug(
                f"\n[ROADMAP COMPUTATION] SKIPPED - Using stored data\n"
                f"  user_id: {user_id}\n"
                f"  stored_topics: {topics_count} remaining topics"
            )
    
    def debug_roadmap_generation(
        self,
        user_id: int,
        course_id: int,
        reason: str = "First time user"
    ):
        """Log roadmap generation trigger - THIS SHOULD BE RARE!"""
        self.logger.warning(
            f"\n{'*'*60}\n"
            f"[ROADMAP GENERATION] *** ROADMAP GENERATION TRIGGERED ***\n"
            f"  user_id: {user_id}\n"
            f"  course_id: {course_id}\n"
            f"  reason: {reason}\n"
            f"  WARNING: This should ONLY happen for NEW users!\n"
            f"{'*'*60}"
        )
    
    def debug_roadmap_response(
        self,
        user_id: int,
        topics_count: int,
        completed_count: int,
        source: str = "stored"
    ):
        """Log final response data."""
        self.logger.debug(
            f"\n[ROADMAP RESPONSE] FINAL RESPONSE topics\n"
            f"  user_id: {user_id}\n"
            f"  topics_to_be_shown count: {topics_count}\n"
            f"  completed_topics count: {completed_count}\n"
            f"  data_source: {source}"
        )
    
    # ============ Progress Debug Methods ============
    
    def debug_progress_update(
        self,
        user_id: int,
        course_id: int,
        topic_key: str,
        completed: bool,
        existing_progress: Optional[dict] = None,
        incoming_progress: Optional[dict] = None
    ):
        """Log progress update operation."""
        existing_count = len(existing_progress) if existing_progress else "NULL"
        
        self.logger.debug(
            f"\n{'='*60}\n"
            f"[PROGRESS UPDATE] ==== UPDATE PROGRESS CALLED ====\n"
            f"  user_id: {user_id}\n"
            f"  course_id: {course_id}\n"
            f"  topic_key: {topic_key}\n"
            f"  marking_as: {'COMPLETED' if completed else 'INCOMPLETE'}\n"
            f"  existing progress_json entries: {existing_count}\n"
            f"  incoming_progress: {incoming_progress}\n"
            f"{'='*60}"
        )
    
    def debug_progress_after_update(
        self,
        user_id: int,
        updated_progress: dict,
        topic_key: str
    ):
        """Log progress after update."""
        topic_state = updated_progress.get(topic_key, "NOT_SET")
        self.logger.debug(
            f"\n[PROGRESS AFTER UPDATE]\n"
            f"  user_id: {user_id}\n"
            f"  updated progress_json entries: {len(updated_progress)}\n"
            f"  topic '{topic_key}' is now: {topic_state}"
        )
    
    def debug_progress_db_commit(
        self,
        user_id: int,
        course_id: int,
        operation: str = "progress_update"
    ):
        """Log DB commit for progress."""
        self.logger.info(
            f"\n[DB COMMIT] ==== DB COMMIT DONE ====\n"
            f"  user_id: {user_id}\n"
            f"  course_id: {course_id}\n"
            f"  operation: {operation}"
        )
    
    # ============ Topics To Be Shown Debug Methods ============
    
    def debug_topics_update(
        self,
        user_id: int,
        roadmap_id: int,
        new_topics: list,
        is_new_record: bool = False
    ):
        """Log topics_to_be_shown update."""
        self.logger.debug(
            f"\n{'='*60}\n"
            f"[TOPICS UPDATE] ==== UPDATING topics_to_be_shown ====\n"
            f"  user_id: {user_id}\n"
            f"  roadmap_id: {roadmap_id}\n"
            f"  new topics_to_be_shown count: {len(new_topics)}\n"
            f"  is_new_record: {is_new_record}\n"
            f"  first 3 topics: {new_topics[:3] if new_topics else []}\n"
            f"{'='*60}"
        )
    
    def debug_topics_read(
        self,
        user_id: int,
        roadmap_id: int,
        topics_json: Optional[dict],
        source: str = "DB"
    ):
        """Log topics_to_be_shown read operation."""
        if topics_json:
            remaining = topics_json.get("remaining", [])
            count = len(remaining)
        else:
            count = "NULL"
        
        self.logger.debug(
            f"\n[TOPICS READ] Reading topics_to_be_shown\n"
            f"  user_id: {user_id}\n"
            f"  roadmap_id: {roadmap_id}\n"
            f"  source: {source}\n"
            f"  remaining topics count: {count}\n"
            f"  is_null: {topics_json is None}"
        )
    
    # ============ Function Flow Debug Methods ============
    
    def debug_entering_function(self, function_name: str, **kwargs):
        """Log function entry."""
        params = ", ".join(f"{k}={v}" for k, v in kwargs.items())
        self.logger.debug(f"[ENTERING FUNCTION] {function_name}({params})")
    
    def debug_exiting_function(self, function_name: str, result: Any = None):
        """Log function exit."""
        result_str = str(result)[:100] if result is not None else "None"
        self.logger.debug(f"[EXITING FUNCTION] {function_name} -> {result_str}")
    
    # ============ Data Flow Debug Methods ============
    
    def debug_data_source(
        self,
        source: str,  # "DB", "CACHE", "COMPUTED", "JSON_FILE"
        data_type: str,  # "topics_to_be_shown", "progress", "roadmap"
        user_id: int,
        is_null: bool = False
    ):
        """Log which data source is being used."""
        self.logger.debug(
            f"[DATA SOURCE] {data_type}\n"
            f"  source: {source}\n"
            f"  user_id: {user_id}\n"
            f"  is_null: {is_null}"
        )
    
    def debug_null_value_detected(
        self,
        field_name: str,
        user_id: int,
        course_id: int,
        action_taken: str = "initializing to empty dict"
    ):
        """Log when a null value is detected and how it's handled."""
        self.logger.warning(
            f"[NULL VALUE DETECTED] {field_name}\n"
            f"  user_id: {user_id}\n"
            f"  course_id: {course_id}\n"
            f"  action_taken: {action_taken}"
        )
    
    def debug_fallback_logic(
        self,
        reason: str,
        fallback_action: str,
        user_id: int
    ):
        """Log when fallback logic is triggered."""
        self.logger.warning(
            f"[FALLBACK LOGIC] {reason}\n"
            f"  user_id: {user_id}\n"
            f"  fallback_action: {fallback_action}"
        )


# ============ Factory Function ============

def get_logger(name: str) -> DebugLogger:
    """
    Get a DebugLogger instance for a module.
    
    Usage:
        from logger import get_logger
        logger = get_logger(__name__)
    """
    return DebugLogger(name)


# ============ Decorator for Function Tracing ============

def trace_function(logger: DebugLogger):
    """
    Decorator to automatically trace function entry/exit.
    
    Usage:
        @trace_function(logger)
        def my_function(arg1, arg2):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger.debug_entering_function(func.__name__, **kwargs)
            try:
                result = func(*args, **kwargs)
                logger.debug_exiting_function(func.__name__, result)
                return result
            except Exception as e:
                logger.error(f"[FUNCTION ERROR] {func.__name__}: {e}")
                raise
        return wrapper
    return decorator


# ============ Quick Test ============

if __name__ == "__main__":
    # Test the logger
    test_logger = get_logger("test")
    test_logger.info("Logger initialized successfully")
    test_logger.debug_roadmap_fetch(user_id=1, course_id=1, learning_mode="PNL")
    test_logger.debug_progress_update(user_id=1, course_id=1, topic_key="test::topic", completed=True)
    test_logger.debug_progress_db_commit(user_id=1, course_id=1)
    print(f"Test complete. Check {LOG_FILE} for output.")

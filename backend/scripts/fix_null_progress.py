"""
Migration Script: Fix NULL progress_json for Old Users

This script fixes the database inconsistency where old users have
progress_json = NULL instead of an empty dict {}.

CRITICAL: Run this script ONCE after deploying the fixes to ensure
all existing users have consistent data.

Usage:
    python -m scripts.fix_null_progress

Or run from the backend directory:
    python scripts/fix_null_progress.py
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from database import SessionLocal, engine
from models import ProgressLevel, TopicsToBeShown
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def fix_null_progress_json(db: Session) -> int:
    """
    Fix all ProgressLevel records where progress_json is NULL.
    
    Returns:
        Number of records fixed
    """
    logger.info("Starting migration: Fix NULL progress_json values...")
    
    # Find all records with NULL progress_json
    null_progress_records = db.query(ProgressLevel).filter(
        ProgressLevel.progress_json.is_(None)
    ).all()
    
    count = len(null_progress_records)
    logger.info(f"Found {count} records with NULL progress_json")
    
    if count == 0:
        logger.info("No records to fix. Database is already consistent.")
        return 0
    
    # Fix each record
    for i, progress in enumerate(null_progress_records):
        logger.info(f"Fixing record {i+1}/{count}: progress_id={progress.progress_id}, user={progress.uid}, course={progress.cid}")
        
        # Set to empty dict
        progress.progress_json = {}
        
        # Mark as modified for SQLAlchemy JSONB detection
        flag_modified(progress, "progress_json")
    
    # Commit all changes
    db.commit()
    logger.info(f"Successfully fixed {count} records")
    
    return count


def fix_null_topics_json(db: Session) -> int:
    """
    Fix all TopicsToBeShown records where topics_json is NULL.
    
    Returns:
        Number of records fixed
    """
    logger.info("Starting migration: Fix NULL topics_json values...")
    
    # Find all records with NULL topics_json
    null_topics_records = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.topics_json.is_(None)
    ).all()
    
    count = len(null_topics_records)
    logger.info(f"Found {count} records with NULL topics_json")
    
    if count == 0:
        logger.info("No records to fix. Database is already consistent.")
        return 0
    
    # Fix each record
    for i, topics in enumerate(null_topics_records):
        logger.info(f"Fixing record {i+1}/{count}: top_id={topics.top_id}, user={topics.uid}")
        
        # Set to default structure
        topics.topics_json = {
            "remaining": [],
            "current": None,
            "current_index": None,
            "total_remaining": 0,
            "is_complete": False
        }
        
        # Mark as modified for SQLAlchemy JSONB detection
        flag_modified(topics, "topics_json")
    
    # Commit all changes
    db.commit()
    logger.info(f"Successfully fixed {count} records")
    
    return count


def verify_database_consistency(db: Session) -> bool:
    """
    Verify that all JSONB fields are consistent (no NULL values).
    
    Returns:
        True if database is consistent, False otherwise
    """
    logger.info("Verifying database consistency...")
    
    # Check ProgressLevel
    null_progress = db.query(ProgressLevel).filter(
        ProgressLevel.progress_json.is_(None)
    ).count()
    
    # Check TopicsToBeShown
    null_topics = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.topics_json.is_(None)
    ).count()
    
    if null_progress > 0 or null_topics > 0:
        logger.warning(f"Database inconsistency detected!")
        logger.warning(f"  - ProgressLevel with NULL progress_json: {null_progress}")
        logger.warning(f"  - TopicsToBeShown with NULL topics_json: {null_topics}")
        return False
    
    logger.info("Database is consistent. No NULL JSONB values found.")
    return True


def run_migration():
    """Run the full migration."""
    logger.info("=" * 60)
    logger.info("NeuroLearn Database Migration: Fix NULL JSONB Values")
    logger.info("=" * 60)
    
    db = SessionLocal()
    
    try:
        # Step 1: Fix NULL progress_json
        progress_fixed = fix_null_progress_json(db)
        
        # Step 2: Fix NULL topics_json
        topics_fixed = fix_null_topics_json(db)
        
        # Step 3: Verify consistency
        is_consistent = verify_database_consistency(db)
        
        # Summary
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  - ProgressLevel records fixed: {progress_fixed}")
        logger.info(f"  - TopicsToBeShown records fixed: {topics_fixed}")
        logger.info(f"  - Database consistent: {is_consistent}")
        logger.info("=" * 60)
        
        if not is_consistent:
            logger.error("Migration completed but database is still inconsistent!")
            return False
        
        logger.info("Migration completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

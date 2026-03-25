from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

# LOGGING: Use centralized debug logger
from logger import get_logger
logger = get_logger(__name__)

from database import get_db
from models import User, Payment, Course, CourseEnrolled, ProgressLevel, TopicsToBeShown
from auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# Pydantic schemas
class DashboardStats(BaseModel):
    total_users: int
    premium_users: int
    total_payments: int
    total_revenue: float


class UserSummary(BaseModel):
    uid: int
    name: Optional[str]
    email: str
    acc_status: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentSummary(BaseModel):
    payment_id: int
    uid: int
    user_name: Optional[str]
    user_email: str
    amount: float
    razor_id: Optional[str]
    order_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CourseStats(BaseModel):
    cid: int
    course_name: str
    enrolled_users: int
    users_with_progress: int


# Endpoints
@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    # Total users
    total_users = db.query(User).count()
    
    # Premium users
    premium_users = db.query(User).filter(
        User.acc_status == "premium"
    ).count()
    
    # Total payments
    total_payments = db.query(Payment).filter(
        Payment.razor_id.isnot(None)  # Only count verified payments
    ).count()
    
    # Total revenue (amount is in rupees)
    total_revenue_result = db.query(func.sum(Payment.amount)).filter(
        Payment.razor_id.isnot(None)
    ).scalar()
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0
    
    return DashboardStats(
        total_users=total_users,
        premium_users=premium_users,
        total_payments=total_payments,
        total_revenue=total_revenue
    )


@router.get("/users", response_model=List[UserSummary])
def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Get paginated list of users"""
    users = db.query(User).order_by(
        User.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        UserSummary(
            uid=u.uid,
            name=u.name,
            email=u.email,
            acc_status=u.acc_status,
            is_admin=u.is_admin,
            created_at=u.created_at
        )
        for u in users
    ]


@router.get("/payments", response_model=List[PaymentSummary])
def get_all_payments(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """Get list of payments joined with users"""
    payments = db.query(Payment).join(
        User, Payment.uid == User.uid
    ).order_by(
        Payment.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        PaymentSummary(
            payment_id=p.payment_id,
            uid=p.uid,
            user_name=p.user.name,
            user_email=p.user.email,
            amount=float(p.amount),
            razor_id=p.razor_id,
            order_id=p.order_id,
            created_at=p.created_at
        )
        for p in payments
    ]


@router.post("/users/{uid}/toggle-premium")
def toggle_user_premium(
    uid: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle user acc_status between 'free' and 'premium'"""
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Toggle between 'free' and 'premium'
    new_status = "premium" if user.acc_status == "free" else "free"
    user.acc_status = new_status
    db.commit()
    db.refresh(user)
    
    return {
        "success": True,
        "message": f"User {user.name} status changed to {new_status}",
        "uid": user.uid,
        "acc_status": user.acc_status
    }


@router.get("/stats/courses", response_model=List[CourseStats])
def get_course_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get course statistics using enrollments and progress"""
    courses = db.query(Course).all()
    
    result = []
    for course in courses:
        # Count enrollments
        enrolled_users = db.query(CourseEnrolled).filter(
            CourseEnrolled.cid == course.cid
        ).count()
        
        # Count users with progress
        users_with_progress = db.query(ProgressLevel).filter(
            ProgressLevel.cid == course.cid
        ).distinct(ProgressLevel.uid).count()
        
        result.append(CourseStats(
            cid=course.cid,
            course_name=course.course_name,
            enrolled_users=enrolled_users,
            users_with_progress=users_with_progress
        ))
    
    return result


# ============ Database Migration Endpoints ============

@router.post("/migrate/fix-null-progress")
def fix_null_progress_json(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    FIX: Migration endpoint to fix NULL progress_json for old users.
    
    This endpoint:
    1. Finds all ProgressLevel records with NULL progress_json
    2. Sets them to empty dict {}
    3. Commits the changes
    
    CRITICAL: Run this ONCE after deploying the progress fixes.
    """
    logger.info(f"[ADMIN] Migration: fix-null-progress called by admin={current_admin.uid}")
    
    try:
        # Find all records with NULL progress_json
        null_progress_records = db.query(ProgressLevel).filter(
            ProgressLevel.progress_json.is_(None)
        ).all()
        
        count = len(null_progress_records)
        logger.info(f"[ADMIN] Found {count} records with NULL progress_json")
        
        if count == 0:
            return {
                "success": True,
                "message": "No records to fix. Database is already consistent.",
                "fixed_count": 0
            }
        
        # Fix each record
        for progress in null_progress_records:
            progress.progress_json = {}
            flag_modified(progress, "progress_json")
        
        # Commit all changes
        db.commit()
        logger.info(f"[ADMIN] Successfully fixed {count} ProgressLevel records")
        
        return {
            "success": True,
            "message": f"Fixed {count} records with NULL progress_json",
            "fixed_count": count
        }
        
    except Exception as e:
        logger.error(f"[ADMIN] Migration failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )


@router.post("/migrate/fix-null-topics")
def fix_null_topics_json(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    FIX: Migration endpoint to fix NULL topics_json for old users.
    
    This endpoint:
    1. Finds all TopicsToBeShown records with NULL topics_json
    2. Sets them to a default structure
    3. Commits the changes
    """
    logger.info(f"[ADMIN] Migration: fix-null-topics called by admin={current_admin.uid}")
    
    try:
        # Find all records with NULL topics_json
        null_topics_records = db.query(TopicsToBeShown).filter(
            TopicsToBeShown.topics_json.is_(None)
        ).all()
        
        count = len(null_topics_records)
        logger.info(f"[ADMIN] Found {count} records with NULL topics_json")
        
        if count == 0:
            return {
                "success": True,
                "message": "No records to fix. Database is already consistent.",
                "fixed_count": 0
            }
        
        # Fix each record
        for topics in null_topics_records:
            topics.topics_json = {
                "remaining": [],
                "current": None,
                "current_index": None,
                "total_remaining": 0,
                "is_complete": False
            }
            flag_modified(topics, "topics_json")
        
        # Commit all changes
        db.commit()
        logger.info(f"[ADMIN] Successfully fixed {count} TopicsToBeShown records")
        
        return {
            "success": True,
            "message": f"Fixed {count} records with NULL topics_json",
            "fixed_count": count
        }
        
    except Exception as e:
        logger.error(f"[ADMIN] Migration failed: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration failed: {str(e)}"
        )


@router.get("/health/database")
def check_database_health(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Check database health and consistency.
    
    Returns:
        - null_progress_count: Number of ProgressLevel records with NULL progress_json
        - null_topics_count: Number of TopicsToBeShown records with NULL topics_json
        - is_consistent: True if no NULL JSONB values found
    """
    logger.info(f"[ADMIN] Database health check called by admin={current_admin.uid}")
    
    # Check ProgressLevel
    null_progress_count = db.query(ProgressLevel).filter(
        ProgressLevel.progress_json.is_(None)
    ).count()
    
    # Check TopicsToBeShown
    null_topics_count = db.query(TopicsToBeShown).filter(
        TopicsToBeShown.topics_json.is_(None)
    ).count()
    
    is_consistent = null_progress_count == 0 and null_topics_count == 0
    
    return {
        "success": True,
        "null_progress_count": null_progress_count,
        "null_topics_count": null_topics_count,
        "is_consistent": is_consistent,
        "message": "Database is consistent" if is_consistent else "Database has inconsistencies - run migrations"
    }

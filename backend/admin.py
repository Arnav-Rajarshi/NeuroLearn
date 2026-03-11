from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from database import get_db
from models.roadmap_models import User, Payment, Course, CourseEnrolled, ProgressLevel
from core.auth import get_current_admin

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

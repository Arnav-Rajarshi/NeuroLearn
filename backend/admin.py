from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List

from database import get_db
from models import User, Progress, Payment
from auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


# Pydantic schemas
class DashboardStats(BaseModel):
    total_users: int
    premium_users: int
    total_payments: int
    total_revenue: float
    daily_active_users: int
    monthly_active_users: int


class UserSummary(BaseModel):
    id: int
    username: str
    email: str
    premium: bool
    last_login: datetime
    created_at: datetime


class PaymentSummary(BaseModel):
    id: int
    user_id: int
    username: str
    amount: float
    status: str
    created_at: datetime


# Endpoints
@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Total users (excluding admin)
    total_users = db.query(User).filter(User.is_admin == False).count()
    
    # Premium users
    premium_users = db.query(User).filter(
        User.premium == True,
        User.is_admin == False
    ).count()
    
    # Total successful payments
    total_payments = db.query(Payment).filter(Payment.status == "paid").count()
    
    # Total revenue (in rupees)
    total_revenue_paise = db.query(func.sum(Payment.amount)).filter(
        Payment.status == "paid"
    ).scalar() or 0
    total_revenue = total_revenue_paise / 100
    
    # Daily active users (logged in within last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    daily_active_users = db.query(User).filter(
        User.last_login >= yesterday,
        User.is_admin == False
    ).count()
    
    # Monthly active users (logged in within last 30 days)
    last_month = datetime.utcnow() - timedelta(days=30)
    monthly_active_users = db.query(User).filter(
        User.last_login >= last_month,
        User.is_admin == False
    ).count()
    
    return DashboardStats(
        total_users=total_users,
        premium_users=premium_users,
        total_payments=total_payments,
        total_revenue=total_revenue,
        daily_active_users=daily_active_users,
        monthly_active_users=monthly_active_users
    )


@router.get("/users", response_model=List[UserSummary])
def get_all_users(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    users = db.query(User).filter(
        User.is_admin == False
    ).offset(skip).limit(limit).all()
    
    return [
        UserSummary(
            id=u.id,
            username=u.username,
            email=u.email,
            premium=u.premium,
            last_login=u.last_login,
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
    payments = db.query(Payment).join(User).order_by(
        Payment.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        PaymentSummary(
            id=p.id,
            user_id=p.user_id,
            username=p.user.username,
            amount=p.amount / 100,
            status=p.status,
            created_at=p.created_at
        )
        for p in payments
    ]


@router.post("/users/{user_id}/toggle-premium")
def toggle_user_premium(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.premium = not user.premium
    db.commit()
    
    return {
        "success": True,
        "message": f"User {user.username} premium status set to {user.premium}",
        "premium": user.premium
    }


@router.get("/stats/courses")
def get_course_stats(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Get course enrollment stats
    course_stats = db.query(
        Progress.course_name,
        func.count(Progress.id).label("enrolled_users"),
        func.avg(Progress.roadmap_progress).label("avg_progress"),
        func.sum(Progress.total_xp).label("total_xp_earned")
    ).group_by(Progress.course_name).all()
    
    return [
        {
            "course_name": stat.course_name,
            "enrolled_users": stat.enrolled_users,
            "avg_progress": round(stat.avg_progress or 0, 2),
            "total_xp_earned": stat.total_xp_earned or 0
        }
        for stat in course_stats
    ]

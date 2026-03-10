from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
import razorpay
import hmac
import hashlib

from database import get_db
from models import User, Payment
from auth import get_current_user
from config import RAZORPAY_KEY, RAZORPAY_SECRET, PREMIUM_AMOUNT, PREMIUM_CURRENCY

router = APIRouter(prefix="/payments", tags=["Payments"])


# Pydantic schemas
class OrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key: str


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentResponse(BaseModel):
    success: bool
    message: str
    acc_status: str


# Initialize Razorpay client
def get_razorpay_client():
    if not RAZORPAY_KEY or not RAZORPAY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay credentials not configured"
        )
    return razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))


# Endpoints
@router.get("/create-order", response_model=OrderResponse)
def create_order(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a Razorpay order for premium subscription"""
    # Check if user is already premium
    if current_user.acc_status == "premium":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a premium member"
        )
    
    try:
        client = get_razorpay_client()
        
        # PREMIUM_AMOUNT is in rupees, Razorpay API needs paise
        amount_in_paise = PREMIUM_AMOUNT * 100
        
        # Create Razorpay order
        order_data = {
            "amount": amount_in_paise,
            "currency": PREMIUM_CURRENCY,
            "receipt": f"receipt_{current_user.uid}_{int(datetime.utcnow().timestamp())}",
            "notes": {
                "user_id": str(current_user.uid),
                "user_name": current_user.name or ""
            }
        }
        
        order = client.order.create(data=order_data)
        
        # Store order in database (amount stored in rupees)
        payment = Payment(
            uid=current_user.uid,
            order_id=order["id"],
            amount=Decimal(str(PREMIUM_AMOUNT))
        )
        db.add(payment)
        db.commit()
        
        return OrderResponse(
            order_id=order["id"],
            amount=amount_in_paise,
            currency=PREMIUM_CURRENCY,
            key=RAZORPAY_KEY
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@router.post("/verify-payment", response_model=PaymentResponse)
def verify_payment(
    verification: PaymentVerification,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify Razorpay payment and upgrade user to premium"""
    # Find the payment record
    payment = db.query(Payment).filter(
        Payment.order_id == verification.razorpay_order_id,
        Payment.uid == current_user.uid
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if already verified
    if payment.razor_id:
        return PaymentResponse(
            success=True,
            message="Payment already verified",
            acc_status="premium"
        )
    
    try:
        # Verify signature
        message = f"{verification.razorpay_order_id}|{verification.razorpay_payment_id}"
        generated_signature = hmac.new(
            RAZORPAY_SECRET.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != verification.razorpay_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Payment verified - update records
        payment.razor_id = verification.razorpay_payment_id
        current_user.acc_status = "premium"
        
        db.commit()
        
        return PaymentResponse(
            success=True,
            message="Payment verified successfully. You are now a premium member!",
            acc_status="premium"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )


@router.get("/history")
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get payment history for current user"""
    payments = db.query(Payment).filter(
        Payment.uid == current_user.uid
    ).order_by(Payment.created_at.desc()).all()
    
    return [
        {
            "payment_id": p.payment_id,
            "order_id": p.order_id,
            "razor_id": p.razor_id,
            "amount": float(p.amount),
            "created_at": p.created_at,
            "verified": p.razor_id is not None
        }
        for p in payments
    ]

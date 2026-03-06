from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
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
    premium: bool


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
    # Check if user is already premium
    if current_user.premium:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a premium member"
        )
    
    try:
        client = get_razorpay_client()
        
        # Create Razorpay order
        order_data = {
            "amount": PREMIUM_AMOUNT,  # Amount in paise
            "currency": PREMIUM_CURRENCY,
            "receipt": f"receipt_{current_user.id}_{datetime.utcnow().timestamp()}",
            "notes": {
                "user_id": str(current_user.id),
                "username": current_user.username
            }
        }
        
        order = client.order.create(data=order_data)
        
        # Store order in database
        payment = Payment(
            user_id=current_user.id,
            razorpay_order_id=order["id"],
            amount=PREMIUM_AMOUNT,
            currency=PREMIUM_CURRENCY,
            status="created"
        )
        db.add(payment)
        db.commit()
        
        return OrderResponse(
            order_id=order["id"],
            amount=PREMIUM_AMOUNT,
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
    # Find the payment record
    payment = db.query(Payment).filter(
        Payment.razorpay_order_id == verification.razorpay_order_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if payment.status == "paid":
        return PaymentResponse(
            success=True,
            message="Payment already verified",
            premium=True
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
            payment.status = "failed"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Payment verified successfully
        payment.razorpay_payment_id = verification.razorpay_payment_id
        payment.razorpay_signature = verification.razorpay_signature
        payment.status = "paid"
        
        # Upgrade user to premium
        current_user.premium = True
        
        db.commit()
        
        return PaymentResponse(
            success=True,
            message="Payment verified successfully. You are now a premium member!",
            premium=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        payment.status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment verification failed: {str(e)}"
        )


@router.get("/history")
def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()
    
    return [
        {
            "id": p.id,
            "order_id": p.razorpay_order_id,
            "payment_id": p.razorpay_payment_id,
            "amount": p.amount / 100,  # Convert paise to rupees
            "currency": p.currency,
            "status": p.status,
            "created_at": p.created_at
        }
        for p in payments
    ]

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    uid = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    acc_status = Column(String, default="free")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")


class Progress(Base):
    __tablename__ = "progress_level"

    progress_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    cid = Column(Integer, nullable=False)
    top_id = Column(Integer, nullable=True)
    progress_json = Column(JSON, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="progress")


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    amount = Column(Integer, nullable=False)
    razor_id = Column(Integer, nullable=True)
    order_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="payments")

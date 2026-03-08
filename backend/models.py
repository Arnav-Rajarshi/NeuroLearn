from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum


class AccStatus(str, enum.Enum):
    free = "free"
    premium = "premium"


class LearningMode(str, enum.Enum):
    PNL = "PNL"
    PRACTICE = "PRACTICE"


class User(Base):
    __tablename__ = "users"

    uid = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    acc_status = Column(String(20), default="free")  # 'free' or 'premium'
    is_admin = Column(String(10), default="false")  # Keep for admin check
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    courses_enrolled = relationship("CourseEnrolled", back_populates="user", cascade="all, delete-orphan")
    topics_to_be_shown = relationship("TopicsToBeShown", back_populates="user", cascade="all, delete-orphan")
    progress_levels = relationship("ProgressLevel", back_populates="user", cascade="all, delete-orphan")
    course_preferences = relationship("CoursePreference", back_populates="user", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)  # Amount in rupees
    razor_id = Column(String(100), nullable=True)
    order_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="payments")


class Course(Base):
    __tablename__ = "courses"

    cid = Column(Integer, primary_key=True, index=True)
    course_name = Column(String(100), unique=True, nullable=False)

    # Relationships
    enrollments = relationship("CourseEnrolled", back_populates="course", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="course", cascade="all, delete-orphan")
    progress_levels = relationship("ProgressLevel", back_populates="course", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="course", cascade="all, delete-orphan")


class CourseEnrolled(Base):
    __tablename__ = "courses_enrolled"

    uid = Column(Integer, ForeignKey("users.uid"), primary_key=True)
    cid = Column(Integer, ForeignKey("courses.cid"), primary_key=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="courses_enrolled")
    course = relationship("Course", back_populates="enrollments")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    rid = Column(Integer, primary_key=True, index=True)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    lm = Column(String(20), nullable=False)  # 'PNL' or 'PRACTICE'

    # Relationships
    course = relationship("Course", back_populates="roadmaps")
    topics_shown = relationship("TopicsToBeShown", back_populates="roadmap", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="roadmap", cascade="all, delete-orphan")


class TopicsToBeShown(Base):
    __tablename__ = "topics_to_be_shown"

    top_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    rid = Column(Integer, ForeignKey("roadmaps.rid"), nullable=False)
    topics_json = Column(JSONB, default=list)

    # Relationships
    user = relationship("User", back_populates="topics_to_be_shown")
    roadmap = relationship("Roadmap", back_populates="topics_shown")
    progress_levels = relationship("ProgressLevel", back_populates="topics_shown", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="topics_shown", cascade="all, delete-orphan")


class ProgressLevel(Base):
    __tablename__ = "progress_level"

    progress_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    top_id = Column(Integer, ForeignKey("topics_to_be_shown.top_id"), nullable=True)
    progress_json = Column(JSONB, default=dict)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="progress_levels")
    course = relationship("Course", back_populates="progress_levels")
    topics_shown = relationship("TopicsToBeShown", back_populates="progress_levels")


class CoursePreference(Base):
    __tablename__ = "course_preferences"

    pref_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    rid = Column(Integer, ForeignKey("roadmaps.rid"), nullable=True)
    lm = Column(String(20), nullable=True)  # 'PNL' or 'PRACTICE'
    goal_date = Column(DateTime, nullable=True)
    hrs_per_week = Column(Integer, nullable=True)
    top_id = Column(Integer, ForeignKey("topics_to_be_shown.top_id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="course_preferences")
    course = relationship("Course", back_populates="preferences")
    roadmap = relationship("Roadmap", back_populates="preferences")
    topics_shown = relationship("TopicsToBeShown", back_populates="preferences")

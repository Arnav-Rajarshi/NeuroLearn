from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Date, Boolean, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    """users table"""
    __tablename__ = "users"

    uid = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    acc_status = Column(String, default="free")  # 'free' or 'premium'
    is_admin = Column(Boolean, default=False)  # Admin privilege flag
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrolled", back_populates="user", cascade="all, delete-orphan")
    progress_entries = relationship("ProgressLevel", back_populates="user", cascade="all, delete-orphan")
    topics_shown = relationship("TopicsToBeShown", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="user", cascade="all, delete-orphan")


class Course(Base):
    """courses table"""
    __tablename__ = "courses"

    cid = Column(Integer, primary_key=True, index=True)
    course_name = Column(String, nullable=False)

    # Relationships
    roadmaps = relationship("Roadmap", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("CourseEnrolled", back_populates="course", cascade="all, delete-orphan")
    progress_entries = relationship("ProgressLevel", back_populates="course", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="course", cascade="all, delete-orphan")


class Roadmap(Base):
    """roadmaps table"""
    __tablename__ = "roadmaps"

    rid = Column(Integer, primary_key=True, index=True)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    lm = Column(String, nullable=False)  # 'PNL' or 'PRACTICE'

    # Relationships
    course = relationship("Course", back_populates="roadmaps")
    topics_shown = relationship("TopicsToBeShown", back_populates="roadmap", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="roadmap", cascade="all, delete-orphan")


class CourseEnrolled(Base):
    """courses_enrolled table"""
    __tablename__ = "courses_enrolled"

    uid = Column(Integer, ForeignKey("users.uid"), primary_key=True)
    cid = Column(Integer, ForeignKey("courses.cid"), primary_key=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class TopicsToBeShown(Base):
    """topics_to_be_shown table"""
    __tablename__ = "topics_to_be_shown"

    top_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    rid = Column(Integer, ForeignKey("roadmaps.rid"), nullable=False)
    topics_json = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", back_populates="topics_shown")
    roadmap = relationship("Roadmap", back_populates="topics_shown")
    progress_entries = relationship("ProgressLevel", back_populates="topic", cascade="all, delete-orphan")
    preferences = relationship("CoursePreference", back_populates="topic", cascade="all, delete-orphan")


class ProgressLevel(Base):
    """progress_level table"""
    __tablename__ = "progress_level"
    __table_args__ = (
        UniqueConstraint('uid', 'cid', name='uq_progress_uid_cid'),
    )

    progress_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    top_id = Column(Integer, ForeignKey("topics_to_be_shown.top_id"), nullable=True)
    progress_json = Column(JSONB, default=list, nullable=False)
    topics_to_be_shown_json = Column(JSONB, default=list, nullable=False)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="progress_entries")
    course = relationship("Course", back_populates="progress_entries")
    topic = relationship("TopicsToBeShown", back_populates="progress_entries")


class CoursePreference(Base):
    """course_preferences table"""
    __tablename__ = "course_preferences"

    pref_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    cid = Column(Integer, ForeignKey("courses.cid"), nullable=False)
    rid = Column(Integer, ForeignKey("roadmaps.rid"), nullable=False)
    lm = Column(String, nullable=True)  # 'PNL' or 'PRACTICE'
    goal_date = Column(Date, nullable=True)
    hrs_per_week = Column(Integer, nullable=True)
    top_id = Column(Integer, ForeignKey("topics_to_be_shown.top_id"), nullable=True)
    # known_topics = Column(JSON, nullable=True)

    # Relationships
    user = relationship("User", back_populates="preferences")
    course = relationship("Course", back_populates="preferences")
    roadmap = relationship("Roadmap", back_populates="preferences")
    topic = relationship("TopicsToBeShown", back_populates="preferences")


class Payment(Base):
    """payments table"""
    __tablename__ = "payments"

    payment_id = Column(Integer, primary_key=True, index=True)
    uid = Column(Integer, ForeignKey("users.uid"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    razor_id = Column(String, nullable=True)
    order_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="payments")

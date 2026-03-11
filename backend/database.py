# ─── NeuroLearn · SQLAlchemy Database Configuration ───────────────────────────
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Database URL - prefer environment variable, fallback to Neon connection string
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_ehNz4XPW7COM@ep-flat-union-a10rmr6m-pooler.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require"
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args={"sslmode": "require"}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base for models
Base = declarative_base()


def get_db():
    """
    Dependency that provides a database session.
    Used by FastAPI endpoints via Depends(get_db).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    Note: Tables should already exist in production - this is for reference only.
    """
    # Import models to register them with Base
    from models.roadmap_models import (
        User, Course, Roadmap, CourseEnrolled, 
        TopicsToBeShown, ProgressLevel, CoursePreference, Payment
    )
    # Don't create tables - they already exist in Neon
    # Base.metadata.create_all(bind=engine)
    pass

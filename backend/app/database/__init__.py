from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
import logging

from app.config import DATABASE_URL

# Configure logging
logger = logging.getLogger(__name__)

# Create SQLAlchemy engine
try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Enables connection pool "pre-ping" feature
        pool_size=5,         # Default pool size
        max_overflow=10,     # Allow 10 connections beyond pool_size
        pool_timeout=30,     # Connection timeout in seconds
        pool_recycle=1800,   # Recycle connections after 30 minutes
    )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base for ORM models
Base = declarative_base()

# Database dependency for FastAPI
def get_db():
    """Database session dependency for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility function for getting a session (for use outside of FastAPI endpoints)
@contextmanager
def get_session():
    """Context manager for database sessions outside FastAPI routes"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

# Initialize database (create tables)
def init_db():
    """Create all tables defined in models"""
    from app import models  # Import models here to avoid circular imports
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
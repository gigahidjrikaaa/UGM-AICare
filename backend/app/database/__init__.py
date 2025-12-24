from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Determine the database URL from environment variables (should be using Dockerized setup)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./aika.db")

# Ensure we're using asyncpg for PostgreSQL connections
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+asyncpg://")
elif DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql+asyncpg://")

# Create async engine with optimal asyncpg configuration
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    # Use PostgreSQL with asyncpg - optimized for high performance
    async_engine = create_async_engine(
        DATABASE_URL,
        echo=False,  # Set to True for SQL logging
        future=True,
        # asyncpg-specific optimizations
        pool_size=20,           # Number of connections to maintain in the pool
        max_overflow=10,        # Additional connections beyond pool_size
        pool_pre_ping=True,     # Validate connections before use
        pool_recycle=3600,      # Recycle connections every hour
        # Connection arguments for asyncpg
        connect_args={
            "server_settings": {
                "jit": "off",                    # Disable JIT for better compatibility
                "application_name": "ugm_aicare", # Identify our application in pg_stat_activity
            },
            "command_timeout": 60,     # Timeout for individual commands
            "ssl": False,
        }
    )
else:
    # Use SQLite with aiosqlite for development/testing
    async_engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        future=True,
        # No specific connect_args needed for aiosqlite in this context
    )

logger.info(f"Using async database: {DATABASE_URL}")

# Create async session factory.
# Prefer SQLAlchemy 2.x's async_sessionmaker when available, but fall back to
# sessionmaker for compatibility (e.g., when alembic is executed in a different env).
try:
    from sqlalchemy.ext.asyncio import async_sessionmaker  # type: ignore

    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
except Exception:
    from sqlalchemy.orm import sessionmaker

    AsyncSessionLocal = sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )

Base = declarative_base()

async def init_db():
    """Initialize database tables asynchronously"""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info(f"Database initialized with asyncpg: {DATABASE_URL}")

    from app.services.admin_bootstrap import ensure_default_admin, ensure_default_counselor

    async with AsyncSessionLocal() as session:
        try:
            await ensure_default_admin(session)
            await ensure_default_counselor(session)
        except Exception as exc:
            await session.rollback()
            logger.error(f"Failed to ensure default users: {exc}")

    from app.domains.mental_health.services.quest_engine_service import QuestEngineService

    async with AsyncSessionLocal() as session:
        try:
            quest_service = QuestEngineService(session)
            await quest_service.ensure_default_templates()
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.error(f"Failed to seed default quest templates: {exc}")

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Async database dependency for FastAPI"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

async def close_db():
    """Gracefully close database connections"""
    await async_engine.dispose()
    logger.info("Database connections closed")

# Connection health check
async def check_db_health() -> bool:
    """Check if database connection is healthy"""
    try:
        from sqlalchemy import text
        async with async_engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


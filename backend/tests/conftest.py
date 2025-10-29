"""
Pytest Configuration and Shared Fixtures
=========================================

This module provides:
- Test database setup (SQLite in-memory)
- FastAPI test client
- Mock user authentication
- Sample test data fixtures
"""

import os
import sys
import pytest
import asyncio
import uuid as uuid_module
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import TypeDecorator, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

# Custom UUID type that works with SQLite for testing
class UUID(TypeDecorator):
    """Platform-independent UUID type.
    
    Uses PostgreSQL's UUID type when available, otherwise uses
    String(36) to store UUID as strings in SQLite.
    """
    impl = String
    cache_ok = True

    def __init__(self, as_uuid=True):
        """Initialize UUID type.
        
        Args:
            as_uuid: Compatibility parameter for PostgreSQL UUID type.
                     Always returns UUID objects regardless of this setting.
        """
        self.as_uuid = as_uuid
        super().__init__(length=36)

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=self.as_uuid))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value) if not self.as_uuid else value
        else:
            if isinstance(value, uuid_module.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid_module.UUID):
            return value
        return uuid_module.UUID(value)


# Monkey patch SQLAlchemy's UUID type for testing with SQLite
import sqlalchemy.dialects.postgresql as postgresql
postgresql.UUID = UUID

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base, get_async_db
from app.main import app
from app.models.user import User
from app.auth_utils import create_access_token

# Test database URL (SQLite in-memory for fast tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Test environment variables
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["JWT_SECRET_KEY"] = "test_jwt_secret_key_for_testing_only"
os.environ["EMAIL_ENCRYPTION_KEY"] = "test_encryption_key_32_bytes_long!"
os.environ["INTERNAL_API_KEY"] = "test_internal_api_key"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async_session = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client with database override."""
    
    async def override_get_async_db():
        yield db_session
    
    app.dependency_overrides[get_async_db] = override_get_async_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user in the database."""
    user = User(
        email="test@ugm.ac.id",
        name="Test User",
        first_name="Test",
        last_name="User",
        google_sub="test_google_sub_123",
        role="student",
        is_active=True,
        created_at=asyncio.get_event_loop().time(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user in the database."""
    user = User(
        email="admin@ugm.ac.id",
        name="Admin User",
        first_name="Admin",
        last_name="User",
        google_sub="admin_google_sub_456",
        role="admin",
        is_active=True,
        created_at=asyncio.get_event_loop().time(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def counselor_user(db_session: AsyncSession) -> User:
    """Create a counselor user in the database."""
    user = User(
        email="counselor@ugm.ac.id",
        name="Counselor User",
        first_name="Counselor",
        last_name="User",
        google_sub="counselor_google_sub_789",
        role="counselor",
        is_active=True,
        created_at=asyncio.get_event_loop().time(),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def test_token(test_user: User) -> str:
    """Generate a JWT token for the test user."""
    return create_access_token(data={"sub": test_user.email, "user_id": test_user.id})


@pytest.fixture
def admin_token(admin_user: User) -> str:
    """Generate a JWT token for the admin user."""
    return create_access_token(data={"sub": admin_user.email, "user_id": admin_user.id})


@pytest.fixture
def counselor_token(counselor_user: User) -> str:
    """Generate a JWT token for the counselor user."""
    return create_access_token(data={"sub": counselor_user.email, "user_id": counselor_user.id})


@pytest.fixture
def auth_headers(test_token: str) -> dict:
    """Generate authentication headers with test token."""
    return {"Authorization": f"Bearer {test_token}"}


@pytest.fixture
def admin_headers(admin_token: str) -> dict:
    """Generate authentication headers with admin token."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def counselor_headers(counselor_token: str) -> dict:
    """Generate authentication headers with counselor token."""
    return {"Authorization": f"Bearer {counselor_token}"}

"""
Database Model Tests
====================

Tests for SQLAlchemy models and database operations.
"""

import pytest
from datetime import datetime, date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.domains.mental_health.models import Conversation, Message, JournalEntry


class TestUserModel:
    """Test User model CRUD operations."""
    
    @pytest.mark.asyncio
    async def test_create_user(self, db_session: AsyncSession):
        """Test creating a new user."""
        user = User(
            email="newuser@ugm.ac.id",
            name="New User",
            first_name="New",
            last_name="User",
            google_sub="google_sub_new",
            role="student",
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        
        assert user.id is not None
        assert user.email == "newuser@ugm.ac.id"
        assert user.role == "student"
        assert user.is_active is True
    
    @pytest.mark.asyncio
    async def test_read_user(self, db_session: AsyncSession, test_user: User):
        """Test reading a user from database."""
        result = await db_session.execute(
            select(User).where(User.email == test_user.email)
        )
        user = result.scalar_one_or_none()
        
        assert user is not None
        assert user.email == test_user.email
        assert user.id == test_user.id
    
    @pytest.mark.asyncio
    async def test_update_user(self, db_session: AsyncSession, test_user: User):
        """Test updating user information."""
        test_user.name = "Updated Name"
        test_user.phone = "+628123456789"
        await db_session.commit()
        await db_session.refresh(test_user)
        
        assert test_user.name == "Updated Name"
        assert test_user.phone == "+628123456789"
    
    @pytest.mark.asyncio
    async def test_delete_user(self, db_session: AsyncSession):
        """Test deleting a user."""
        user = User(
            email="delete@ugm.ac.id",
            name="Delete User",
            role="student",
        )
        db_session.add(user)
        await db_session.commit()
        user_id = user.id
        
        await db_session.delete(user)
        await db_session.commit()
        
        result = await db_session.execute(
            select(User).where(User.id == user_id)
        )
        deleted_user = result.scalar_one_or_none()
        assert deleted_user is None
    
    @pytest.mark.asyncio
    async def test_user_unique_email(self, db_session: AsyncSession, test_user: User):
        """Test that email must be unique."""
        duplicate_user = User(
            email=test_user.email,  # Same email
            name="Duplicate User",
            role="student",
        )
        db_session.add(duplicate_user)
        
        with pytest.raises(Exception):  # Should raise IntegrityError
            await db_session.commit()


class TestConversationModel:
    """Test Conversation model operations."""
    
    @pytest.mark.asyncio
    async def test_create_conversation(self, db_session: AsyncSession, test_user: User):
        """Test creating a conversation."""
        conversation = Conversation(
            user_id=test_user.id,
            title="Test Conversation",
            created_at=datetime.now(),
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)
        
        assert conversation.id is not None
        assert conversation.user_id == test_user.id
        assert conversation.title == "Test Conversation"
    
    @pytest.mark.asyncio
    async def test_conversation_relationship(self, db_session: AsyncSession, test_user: User):
        """Test conversation-user relationship."""
        conversation = Conversation(
            user_id=test_user.id,
            title="Relationship Test",
            created_at=datetime.now(),
        )
        db_session.add(conversation)
        await db_session.commit()
        await db_session.refresh(conversation)
        
        # Query with relationship
        result = await db_session.execute(
            select(Conversation).where(Conversation.id == conversation.id)
        )
        conv = result.scalar_one()
        
        assert conv.user_id == test_user.id


class TestJournalModel:
    """Test JournalEntry model operations."""
    
    @pytest.mark.asyncio
    async def test_create_journal_entry(self, db_session: AsyncSession, test_user: User):
        """Test creating a journal entry."""
        entry = JournalEntry(
            user_id=test_user.id,
            content="Today was a good day. I felt happy.",
            mood="happy",
            created_at=datetime.now(),
        )
        db_session.add(entry)
        await db_session.commit()
        await db_session.refresh(entry)
        
        assert entry.id is not None
        assert entry.user_id == test_user.id
        assert entry.content == "Today was a good day. I felt happy."
        assert entry.mood == "happy"
    
    @pytest.mark.asyncio
    async def test_journal_privacy(self, db_session: AsyncSession, test_user: User):
        """Test journal entry privacy flag."""
        entry = JournalEntry(
            user_id=test_user.id,
            content="Private thoughts",
            mood="neutral",
            is_private=True,
            created_at=datetime.now(),
        )
        db_session.add(entry)
        await db_session.commit()
        await db_session.refresh(entry)
        
        assert entry.is_private is True

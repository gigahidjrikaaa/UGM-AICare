"""Tests for the tool calling system.

This module tests the core tool functionality including:
- Tool schema generation
- Tool execution with database queries
- Error handling and validation
"""
import pytest
from datetime import datetime, timedelta

from app.core.tools import (
    execute_get_conversation_summaries,
    execute_get_journal_entries,
    execute_get_conversation_context,
    execute_tool_call,
    get_aika_tools,
)
from app.models import Conversation, JournalEntry, UserSummary


@pytest.fixture
async def sample_summaries(db, test_user):
    """Create sample conversation summaries for testing."""
    summaries = []
    for i in range(3):
        summary = UserSummary(
            user_id=test_user.id,
            summary_text=f"Test summary {i+1}: Discussed topics A, B, and C",
            summarized_session_id=f"session_{i}",
            timestamp=datetime.utcnow() - timedelta(days=i),
        )
        db.add(summary)
        summaries.append(summary)
    await db.commit()
    return summaries


@pytest.fixture
async def sample_journals(db, test_user):
    """Create sample journal entries for testing."""
    journals = []
    for i in range(3):
        entry = JournalEntry(
            user_id=test_user.id,
            content=f"Test journal entry {i+1}: Feeling stressed about exams and deadlines",
            mood_score=3 + i,
            entry_date=datetime.utcnow() - timedelta(days=i),
        )
        db.add(entry)
        journals.append(entry)
    await db.commit()
    return journals


@pytest.fixture
async def sample_conversations(db, test_user):
    """Create sample conversation messages for testing."""
    session_id = "test_session_123"
    conversations = []
    for i in range(5):
        conv = Conversation(
            user_id=test_user.id,
            session_id=session_id,
            message=f"User message {i+1}",
            response=f"Assistant response {i+1}",
            timestamp=datetime.utcnow() - timedelta(minutes=i),
        )
        db.add(conv)
        conversations.append(conv)
    await db.commit()
    return session_id, conversations


class TestToolSchemas:
    """Test tool schema generation."""

    def test_get_aika_tools_returns_list(self):
        """Test that get_aika_tools returns a list of tools."""
        tools = get_aika_tools()
        assert isinstance(tools, list)
        assert len(tools) > 0

    def test_tool_has_function_declarations(self):
        """Test that tools have function declarations."""
        tools = get_aika_tools()
        tool = tools[0]
        assert hasattr(tool, 'function_declarations')
        assert len(tool.function_declarations) > 0

    def test_tool_function_has_required_fields(self):
        """Test that tool functions have required fields."""
        tools = get_aika_tools()
        func = tools[0].function_declarations[0]
        assert hasattr(func, 'name')
        assert hasattr(func, 'description')
        assert hasattr(func, 'parameters')


class TestGetConversationSummaries:
    """Test the get_conversation_summaries tool."""

    @pytest.mark.asyncio
    async def test_retrieve_summaries_success(self, db, test_user, sample_summaries):
        """Test successful retrieval of conversation summaries."""
        result = await execute_get_conversation_summaries(
            db=db,
            user_id=test_user.id,
            limit=5,
        )

        assert result["success"] is True
        assert "summaries" in result
        assert result["count"] == 3
        assert len(result["summaries"]) == 3

    @pytest.mark.asyncio
    async def test_retrieve_summaries_with_limit(self, db, test_user, sample_summaries):
        """Test retrieval with custom limit."""
        result = await execute_get_conversation_summaries(
            db=db,
            user_id=test_user.id,
            limit=2,
        )

        assert result["success"] is True
        assert result["count"] == 2
        assert len(result["summaries"]) == 2

    @pytest.mark.asyncio
    async def test_retrieve_summaries_no_data(self, db, test_user):
        """Test retrieval when no summaries exist."""
        result = await execute_get_conversation_summaries(
            db=db,
            user_id=test_user.id,
            limit=5,
        )

        assert result["success"] is True
        assert result["count"] == 0
        assert len(result["summaries"]) == 0
        assert "message" in result

    @pytest.mark.asyncio
    async def test_limit_validation(self, db, test_user, sample_summaries):
        """Test that limit is properly validated and capped."""
        result = await execute_get_conversation_summaries(
            db=db,
            user_id=test_user.id,
            limit=100,  # Exceeds max
        )

        assert result["success"] is True
        # Should be capped at MAX_SUMMARIES (10)
        assert result["count"] <= 10


class TestGetJournalEntries:
    """Test the get_journal_entries tool."""

    @pytest.mark.asyncio
    async def test_retrieve_journals_success(self, db, test_user, sample_journals):
        """Test successful retrieval of journal entries."""
        result = await execute_get_journal_entries(
            db=db,
            user_id=test_user.id,
            limit=5,
        )

        assert result["success"] is True
        assert "entries" in result
        assert result["count"] == 3
        assert len(result["entries"]) == 3

    @pytest.mark.asyncio
    async def test_retrieve_journals_with_keywords(self, db, test_user, sample_journals):
        """Test retrieval with keyword search."""
        result = await execute_get_journal_entries(
            db=db,
            user_id=test_user.id,
            keywords=["stressed", "exams"],
            limit=5,
        )

        assert result["success"] is True
        assert result["count"] > 0
        # Verify content contains keywords
        for entry in result["entries"]:
            content_lower = entry["content"].lower()
            assert "stressed" in content_lower or "exams" in content_lower

    @pytest.mark.asyncio
    async def test_retrieve_journals_with_date_filter(self, db, test_user, sample_journals):
        """Test retrieval with date filter."""
        result = await execute_get_journal_entries(
            db=db,
            user_id=test_user.id,
            days_ago=1,  # Only last 24 hours
            limit=5,
        )

        assert result["success"] is True
        # Should have at least one entry from today
        assert result["count"] >= 1

    @pytest.mark.asyncio
    async def test_content_truncation(self, db, test_user):
        """Test that long journal entries are truncated."""
        # Create a very long journal entry
        long_content = "A" * 500  # Exceeds MAX_JOURNAL_CONTENT_LENGTH
        entry = JournalEntry(
            user_id=test_user.id,
            content=long_content,
            mood_score=5,
            entry_date=datetime.utcnow(),
        )
        db.add(entry)
        await db.commit()

        result = await execute_get_journal_entries(
            db=db,
            user_id=test_user.id,
            limit=1,
        )

        assert result["success"] is True
        assert len(result["entries"]) == 1
        # Content should be truncated
        assert len(result["entries"][0]["content"]) <= 300


class TestGetConversationContext:
    """Test the get_conversation_context tool."""

    @pytest.mark.asyncio
    async def test_retrieve_conversation_success(self, db, test_user, sample_conversations):
        """Test successful retrieval of conversation context."""
        session_id, _ = sample_conversations

        result = await execute_get_conversation_context(
            db=db,
            user_id=test_user.id,
            session_id=session_id,
            message_limit=10,
        )

        assert result["success"] is True
        assert "messages" in result
        assert result["count"] == 5
        assert len(result["messages"]) == 5
        assert result["session_id"] == session_id

    @pytest.mark.asyncio
    async def test_retrieve_latest_session(self, db, test_user, sample_conversations):
        """Test retrieval of latest session when session_id not provided."""
        result = await execute_get_conversation_context(
            db=db,
            user_id=test_user.id,
            session_id=None,  # Should use latest
            message_limit=10,
        )

        assert result["success"] is True
        assert result["count"] > 0

    @pytest.mark.asyncio
    async def test_message_limit(self, db, test_user, sample_conversations):
        """Test message limit is respected."""
        session_id, _ = sample_conversations

        result = await execute_get_conversation_context(
            db=db,
            user_id=test_user.id,
            session_id=session_id,
            message_limit=2,
        )

        assert result["success"] is True
        assert result["count"] == 2
        assert len(result["messages"]) == 2

    @pytest.mark.asyncio
    async def test_messages_chronological_order(self, db, test_user, sample_conversations):
        """Test that messages are in chronological order (oldest first)."""
        session_id, _ = sample_conversations

        result = await execute_get_conversation_context(
            db=db,
            user_id=test_user.id,
            session_id=session_id,
            message_limit=10,
        )

        assert result["success"] is True
        messages = result["messages"]
        # First message should be oldest
        assert "User message 5" in messages[0]["user_message"]
        # Last message should be newest
        assert "User message 1" in messages[-1]["user_message"]


class TestToolCallDispatcher:
    """Test the central tool call dispatcher."""

    @pytest.mark.asyncio
    async def test_dispatch_conversation_summaries(self, db, test_user, sample_summaries):
        """Test dispatching to get_conversation_summaries."""
        result = await execute_tool_call(
            tool_name="get_conversation_summaries",
            tool_args={"limit": 5},
            db=db,
            user_id=test_user.id,
        )

        assert result["success"] is True
        assert "summaries" in result

    @pytest.mark.asyncio
    async def test_dispatch_journal_entries(self, db, test_user, sample_journals):
        """Test dispatching to get_journal_entries."""
        result = await execute_tool_call(
            tool_name="get_journal_entries",
            tool_args={"limit": 5},
            db=db,
            user_id=test_user.id,
        )

        assert result["success"] is True
        assert "entries" in result

    @pytest.mark.asyncio
    async def test_dispatch_conversation_context(self, db, test_user, sample_conversations):
        """Test dispatching to get_conversation_context."""
        session_id, _ = sample_conversations

        result = await execute_tool_call(
            tool_name="get_conversation_context",
            tool_args={"session_id": session_id, "message_limit": 10},
            db=db,
            user_id=test_user.id,
        )

        assert result["success"] is True
        assert "messages" in result

    @pytest.mark.asyncio
    async def test_dispatch_unknown_tool(self, db, test_user):
        """Test dispatching with unknown tool name."""
        result = await execute_tool_call(
            tool_name="unknown_tool",
            tool_args={},
            db=db,
            user_id=test_user.id,
        )

        assert result["success"] is False
        assert "error" in result
        assert "unknown" in result["error"].lower()


class TestErrorHandling:
    """Test error handling in tool execution."""

    @pytest.mark.asyncio
    async def test_database_error_handling(self, test_user):
        """Test that database errors are handled gracefully."""
        # Pass None as db to trigger error
        result = await execute_get_conversation_summaries(
            db=None,  # type: ignore
            user_id=test_user.id,
            limit=5,
        )

        assert result["success"] is False
        assert "error" in result

    @pytest.mark.asyncio
    async def test_invalid_user_id(self, db):
        """Test handling of invalid user ID."""
        result = await execute_get_conversation_summaries(
            db=db,
            user_id=999999,  # Non-existent user
            limit=5,
        )

        # Should succeed but return empty results
        assert result["success"] is True
        assert result["count"] == 0

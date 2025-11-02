"""
Test suite for Activity Logging functionality.

Tests the real-time activity logging system used by the Aika orchestrator
to track agent activities and provide transparency.
"""

import pytest
from unittest.mock import Mock, AsyncMock
from app.agents.aika.activity_logger import ActivityLogger


class TestActivityLogger:
    """Test suite for ActivityLogger."""

    @pytest.fixture
    def logger(self):
        """Create an ActivityLogger instance."""
        return ActivityLogger()

    def test_initialization(self, logger):
        """Test that logger initializes correctly."""
        assert logger is not None
        assert hasattr(logger, 'log_activity')
        assert hasattr(logger, 'log_agent_start')
        assert hasattr(logger, 'log_agent_complete')

    @pytest.mark.asyncio
    async def test_log_activity_structure(self, logger):
        """Test that log_activity creates proper structure."""
        callback = Mock()
        logger.set_callback(callback)
        
        await logger.log_activity(
            user_id=1,
            action="test_action",
            context={"test": "data"},
            status="success",
            duration_ms=100
        )
        
        # Verify callback was called
        assert callback.called, "Callback should be invoked"
        
        # Verify structure
        call_args = callback.call_args[0][0]
        assert "data" in call_args
        event = call_args["data"]
        assert "timestamp" in event
        assert event["action"] == "test_action"
        assert event["status"] == "success"

    def test_log_agent_start(self, logger):
        """Test agent start logging."""
        callback = Mock()
        logger.set_callback(callback)
        
        logger.log_agent_start("STA", "Analyzing message for safety")
        
        assert callback.called, "Callback should be invoked"
        call_args = callback.call_args[0][0]
        event = call_args["data"]
        assert event["agent"] == "STA"
        assert event["activity_type"] == "start"

    def test_log_agent_complete(self, logger):
        """Test agent completion logging."""
        callback = Mock()
        logger.set_callback(callback)
        
        logger.log_agent_complete("STA", "Risk assessment complete", {"risk": "low"})
        
        assert callback.called, "Callback should be invoked"
        call_args = callback.call_args[0][0]
        event = call_args["data"]
        assert event["agent"] == "STA"
        assert event["activity_type"] == "complete"
        assert event["details"]["risk"] == "low"

    def test_callback_handling(self, logger):
        """Test multiple callbacks can be set."""
        callback1 = Mock()
        callback2 = Mock()
        
        logger.set_callback(callback1)
        logger.log_agent_start("STA", "Test")
        assert callback1.called, "First callback should work"
        
        # Setting new callback should replace old one
        logger.set_callback(callback2)
        logger.log_agent_start("STA", "Test 2")
        assert callback2.called, "Second callback should work"

    def test_no_callback_no_error(self, logger):
        """Test that logging without callback doesn't raise error."""
        # Should not raise any exception
        logger.log_agent_start("STA", "Test")
        logger.log_agent_complete("STA", "Done")


@pytest.mark.integration
class TestActivityLoggingIntegration:
    """Integration tests for activity logging with real orchestrator."""

    @pytest.mark.asyncio
    async def test_orchestrator_activity_logging(self, db_session):
        """Test that orchestrator logs activities correctly."""
        from app.agents.aika.orchestrator import AikaOrchestrator
        
        orchestrator = AikaOrchestrator(db_session)
        
        # Track activities
        activities = []
        def track_activity(data):
            activities.append(data)
        
        orchestrator.set_activity_callback(track_activity)
        
        # Process a message
        result = await orchestrator.process_message(
            user_id=1,
            user_role="user",
            message="I'm feeling stressed",
            conversation_id="test_conv_123",
            session_id="test_session_456"
        )
        
        # Should have logged activities
        assert len(activities) > 0, "Should have logged activities"
        
        # Check that we have different activity types
        activity_types = {a["data"]["activity_type"] for a in activities}
        assert "start" in activity_types or "classify_intent" in activity_types, \
            "Should have start or intent classification activities"

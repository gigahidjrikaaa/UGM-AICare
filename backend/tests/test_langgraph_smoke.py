"""Simple smoke test for LangGraph implementation.

This test verifies that the LangGraph StateGraph can be created and
basic graph structure is correct.
"""
import pytest
from unittest.mock import AsyncMock

from app.agents.graph_state import STAState
from app.agents.sta.sta_graph import create_sta_graph


@pytest.mark.asyncio
async def test_sta_graph_can_be_created():
    """Test that STA graph can be instantiated."""
    # Arrange
    mock_db = AsyncMock()
    
    # Act
    graph = create_sta_graph(mock_db)
    
    # Assert
    assert graph is not None
    # Graph should be compiled and ready to invoke
    assert hasattr(graph, 'ainvoke') or hasattr(graph, 'invoke')


@pytest.mark.asyncio
async def test_sta_state_initialization():
    """Test that STAState can be initialized with required fields."""
    # Arrange & Act
    state: STAState = {
        "user_id": 1,
        "session_id": "test-123",
        "user_hash": "hash-123",
        "message": "Test message",
        "conversation_id": 1,
        "execution_id": "exec-123",
        "errors": [],
        "execution_path": []
    }
    
    # Assert
    assert state["user_id"] == 1
    assert state["message"] == "Test message"
    assert isinstance(state["errors"], list)
    assert isinstance(state["execution_path"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

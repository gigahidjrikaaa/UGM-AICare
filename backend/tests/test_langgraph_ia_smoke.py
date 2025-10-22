"""Simple smoke test for IA (Insights Agent) LangGraph implementation.

This test verifies that the IA graph can be created and basic structure is correct.
"""
import pytest
from unittest.mock import AsyncMock
from datetime import datetime

from app.agents.graph_state import IAState
from app.agents.ia.ia_graph import create_ia_graph


@pytest.mark.asyncio
async def test_ia_graph_can_be_created():
    """Test that IA graph can be instantiated."""
    # Arrange
    mock_db = AsyncMock()
    
    # Act
    graph = create_ia_graph(mock_db)
    
    # Assert
    assert graph is not None
    # Graph should be compiled and ready to invoke
    assert hasattr(graph, 'ainvoke') or hasattr(graph, 'invoke')


@pytest.mark.asyncio
async def test_ia_state_initialization():
    """Test that IAState can be initialized with required fields."""
    # Arrange & Act
    state: IAState = {
        "question_id": "crisis_trend",
        "start_date": datetime(2025, 1, 1),
        "end_date": datetime(2025, 1, 31),
        "user_hash": "analyst-123",
        "execution_id": "exec-ia-123",
        "errors": [],
        "execution_path": [],
        "query_validated": False,
        "consent_validated": False,
        "privacy_enforced": False,
        "query_completed": False
    }
    
    # Assert
    assert state["question_id"] == "crisis_trend"
    assert state["start_date"] == datetime(2025, 1, 1)
    assert state["end_date"] == datetime(2025, 1, 31)
    assert isinstance(state["errors"], list)
    assert isinstance(state["execution_path"], list)
    assert state["privacy_enforced"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

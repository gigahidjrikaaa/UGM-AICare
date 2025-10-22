"""
Test suite for STA (Safety Triage Agent) LangGraph implementation.

Tests the STA StateGraph workflow: message ingestion → PII redaction → risk assessment → routing.
Validates crisis detection, execution tracking, and conditional edge routing.

Author: UGM-AICare Team
Created: 2025-01-17
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
from typing import Dict, Any

from app.agents.sta.sta_graph_service import STAGraphService
from app.agents.graph_state import SafetyAgentState
from app.models.langgraph_tracking import LangGraphExecution


@pytest.fixture
def mock_db_session():
    """Create mock database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def sta_service(mock_db_session):
    """Create STA graph service with mocked dependencies."""
    return STAGraphService(mock_db_session)


# ============================================================================
# Test: Crisis Detection - Level 3 (Immediate Danger)
# ============================================================================

@pytest.mark.asyncio
async def test_sta_detects_crisis_level_3(sta_service, mock_db_session):
    """
    Test STA detection of LEVEL_3_CRISIS (immediate danger, suicidal ideation with plan).
    
    Expected Flow:
    - ingest_message_node: Validates input
    - apply_redaction_node: Redacts PII
    - assess_risk_node: Classifies as LEVEL_3_CRISIS
    - decide_routing: Returns "escalate_sda" (skip SCA, go to SDA)
    
    Validates:
    - risk_level = 3
    - severity = CRITICAL
    - intent = self_harm
    - next_step = escalate_sda
    - execution_path contains all 3 nodes
    """
    # Arrange
    user_id = 1
    session_id = "test-crisis-123"
    user_hash = "hash-123"
    crisis_message = "I want to kill myself. I have pills ready and I'm going to take them tonight."
    conversation_id = 1
    
    # Mock classification result
    mock_classification = {
        "risk_level": 3,
        "risk_score": 0.95,
        "severity": "critical",
        "intent": "self_harm",
        "next_step": "escalate_sda",
        "redacted_message": "I want to kill myself. I have pills ready and I'm going to take them tonight.",
        "requires_immediate_intervention": True
    }
    
    # Mock triage assessment
    mock_assessment = Mock()
    mock_assessment.id = 101
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_get_service, \
         patch('app.agents.sta.sta_graph.execution_tracker') as mock_tracker:
        
        # Mock service and classify method
        mock_sta_service = AsyncMock()
        mock_sta_service.classify = AsyncMock(return_value=Mock(**mock_classification))
        mock_get_service.return_value = mock_sta_service
        
        # Mock execution tracker
        mock_execution = Mock(spec=LangGraphExecution)
        mock_execution.execution_id = "exec-123"
        mock_tracker.start_execution = AsyncMock(return_value=mock_execution)
        mock_tracker.start_node = AsyncMock()
        mock_tracker.complete_node = AsyncMock()
        mock_tracker.trigger_edge = AsyncMock()
        mock_tracker.complete_execution = AsyncMock()
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=crisis_message,
            conversation_id=conversation_id
        )
    
    # Assert
    assert result["risk_level"] == 3
    assert result["risk_score"] == 0.95
    assert result["severity"] == "critical"
    assert result["intent"] == "self_harm"
    assert result["next_step"] == "escalate_sda"
    assert len(result["execution_path"]) >= 3  # At least 3 nodes executed
    assert "sta:ingest_message" in result["execution_path"]
    assert "sta:apply_redaction" in result["execution_path"]
    assert "sta:assess_risk" in result["execution_path"]


# ============================================================================
# Test: Moderate Risk Detection - Level 2
# ============================================================================

@pytest.mark.asyncio
async def test_sta_detects_moderate_risk(sta_service, mock_db_session):
    """
    Test STA detection of LEVEL_2_MODERATE (distress, needs support but no immediate danger).
    
    Expected Flow:
    - assess_risk_node: Classifies as LEVEL_2_MODERATE
    - decide_routing: Returns "route_sca" (send to Support Coach for intervention)
    
    Validates:
    - risk_level = 2
    - severity = MODERATE
    - intent = support_seeking
    - next_step = route_sca
    """
    # Arrange
    user_id = 2
    session_id = "test-moderate-456"
    user_hash = "hash-456"
    moderate_message = "I'm feeling really overwhelmed with my studies. I can't sleep and I'm anxious all the time."
    
    mock_classification = {
        "risk_level": 2,
        "risk_score": 0.60,
        "severity": "moderate",
        "intent": "support_seeking",
        "next_step": "route_sca",
        "redacted_message": moderate_message,
        "requires_immediate_intervention": False
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=moderate_message,
            conversation_id=None
        )
    
    # Assert
    assert result["risk_level"] == 2
    assert result["severity"] == "moderate"
    assert result["intent"] == "support_seeking"
    assert result["next_step"] == "route_sca"


# ============================================================================
# Test: Low Risk Detection - Level 1
# ============================================================================

@pytest.mark.asyncio
async def test_sta_detects_low_risk(sta_service, mock_db_session):
    """
    Test STA detection of LEVEL_1_LOW (mild distress, general conversation).
    
    Expected Flow:
    - assess_risk_node: Classifies as LEVEL_1_LOW
    - decide_routing: Returns "end" (allow normal conversation)
    
    Validates:
    - risk_level = 1
    - severity = LOW
    - next_step = end
    - No intervention needed
    """
    # Arrange
    user_id = 3
    session_id = "test-low-789"
    user_hash = "hash-789"
    low_risk_message = "I'm a bit stressed about my exams next week."
    
    mock_classification = {
        "risk_level": 1,
        "risk_score": 0.25,
        "severity": "low",
        "intent": "general_chat",
        "next_step": "end",
        "redacted_message": low_risk_message,
        "requires_immediate_intervention": False
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=low_risk_message,
            conversation_id=None
        )
    
    # Assert
    assert result["risk_level"] == 1
    assert result["severity"] == "low"
    assert result["next_step"] == "end"


# ============================================================================
# Test: Safe Message - Level 0
# ============================================================================

@pytest.mark.asyncio
async def test_sta_detects_safe_message(sta_service, mock_db_session):
    """
    Test STA detection of LEVEL_0_SAFE (no mental health concerns, information seeking).
    
    Validates:
    - risk_level = 0
    - severity = LOW
    - intent = information_seeking
    - next_step = end
    """
    # Arrange
    user_id = 4
    session_id = "test-safe-111"
    user_hash = "hash-111"
    safe_message = "What are some good study techniques for memorizing information?"
    
    mock_classification = {
        "risk_level": 0,
        "risk_score": 0.05,
        "severity": "low",
        "intent": "information_seeking",
        "next_step": "end",
        "redacted_message": safe_message,
        "requires_immediate_intervention": False
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=safe_message,
            conversation_id=None
        )
    
    # Assert
    assert result["risk_level"] == 0
    assert result["risk_score"] <= 0.10
    assert result["intent"] == "information_seeking"


# ============================================================================
# Test: PII Redaction
# ============================================================================

@pytest.mark.asyncio
async def test_sta_redacts_pii(sta_service, mock_db_session):
    """
    Test that STA apply_redaction_node properly redacts PII before risk assessment.
    
    Validates:
    - Phone numbers redacted: 081234567890 → [PHONE]
    - Email addresses redacted: user@example.com → [EMAIL]
    - Names redacted (if detected)
    - redacted_message stored in state
    - Original message preserved in state.message
    """
    # Arrange
    user_id = 5
    session_id = "test-pii-222"
    user_hash = "hash-222"
    pii_message = "I'm John Doe. Call me at 081234567890 or email john.doe@ugm.ac.id. I need help."
    
    mock_classification = {
        "risk_level": 2,
        "risk_score": 0.50,
        "severity": "moderate",
        "intent": "support_seeking",
        "next_step": "route_sca",
        "redacted_message": "I'm [NAME]. Call me at [PHONE] or email [EMAIL]. I need help.",
        "requires_immediate_intervention": False
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service, \
         patch('app.agents.sta.sta_graph.redact_pii') as mock_redact:
        
        mock_redact.return_value = "I'm [NAME]. Call me at [PHONE] or email [EMAIL]. I need help."
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=pii_message,
            conversation_id=None
        )
    
    # Assert
    assert result["message"] == pii_message  # Original preserved
    assert result["redacted_message"] == "I'm [NAME]. Call me at [PHONE] or email [EMAIL]. I need help."
    assert "[PHONE]" in result["redacted_message"]
    assert "[EMAIL]" in result["redacted_message"]
    assert "081234567890" not in result["redacted_message"]


# ============================================================================
# Test: Execution Tracking
# ============================================================================

@pytest.mark.asyncio
async def test_sta_creates_execution_record(sta_service, mock_db_session):
    """
    Test that STA creates LangGraphExecution record with proper tracking.
    
    Validates:
    - execution_tracker.start_execution called with user context
    - execution_id generated and stored in state
    - started_at timestamp set
    - completed_at timestamp set after execution
    - execution_path contains all node names
    """
    # Arrange
    user_id = 6
    session_id = "test-tracking-333"
    user_hash = "hash-333"
    message = "Test execution tracking"
    
    mock_classification = {
        "risk_level": 0,
        "risk_score": 0.10,
        "severity": "low",
        "intent": "general_chat",
        "next_step": "end",
        "redacted_message": message,
        "requires_immediate_intervention": False
    }
    
    # Mock execution record
    mock_execution = Mock(spec=LangGraphExecution)
    mock_execution.execution_id = "exec-tracking-123"
    mock_execution.started_at = datetime.utcnow()
    mock_execution.completed_at = None
    mock_execution.status = "running"
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service, \
         patch('app.agents.sta.sta_graph.execution_tracker') as mock_tracker:
        
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        mock_tracker.start_execution = AsyncMock(return_value=mock_execution)
        mock_tracker.start_node = AsyncMock()
        mock_tracker.complete_node = AsyncMock()
        mock_tracker.complete_execution = AsyncMock()
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert
    mock_tracker.start_execution.assert_called_once()
    mock_tracker.complete_execution.assert_called_once()
    assert result["execution_id"] == "exec-tracking-123"
    assert "started_at" in result
    assert "completed_at" in result


# ============================================================================
# Test: Node Execution Tracking
# ============================================================================

@pytest.mark.asyncio
async def test_sta_tracks_individual_nodes(sta_service, mock_db_session):
    """
    Test that each node execution is tracked individually.
    
    Validates:
    - execution_tracker.start_node called for each node
    - execution_tracker.complete_node called for each node
    - Node names recorded: "sta:ingest_message", "sta:apply_redaction", "sta:assess_risk"
    """
    # Arrange
    user_id = 7
    session_id = "test-nodes-444"
    user_hash = "hash-444"
    message = "Test node tracking"
    
    mock_classification = {
        "risk_level": 1,
        "risk_score": 0.20,
        "severity": "low",
        "intent": "general_chat",
        "next_step": "end",
        "redacted_message": message
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service, \
         patch('app.agents.sta.sta_graph.execution_tracker') as mock_tracker:
        
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        mock_tracker.start_execution = AsyncMock(return_value=Mock(execution_id="exec-nodes-123"))
        mock_tracker.start_node = AsyncMock()
        mock_tracker.complete_node = AsyncMock()
        mock_tracker.complete_execution = AsyncMock()
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert - Node tracking calls
    assert mock_tracker.start_node.call_count == 3  # 3 nodes: ingest, redact, assess
    assert mock_tracker.complete_node.call_count == 3
    
    # Verify node names
    start_node_calls = [call[0][1] for call in mock_tracker.start_node.call_args_list]
    assert "sta:ingest_message" in start_node_calls
    assert "sta:apply_redaction" in start_node_calls
    assert "sta:assess_risk" in start_node_calls


# ============================================================================
# Test: Error Handling
# ============================================================================

@pytest.mark.asyncio
async def test_sta_handles_classification_error(sta_service, mock_db_session):
    """
    Test STA error handling when classification service fails.
    
    Validates:
    - Exception caught in assess_risk_node
    - Error added to state["errors"]
    - execution_tracker.fail_node called
    - Execution doesn't crash
    - Default safe values returned
    """
    # Arrange
    user_id = 8
    session_id = "test-error-555"
    user_hash = "hash-555"
    message = "Test error handling"
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service, \
         patch('app.agents.sta.sta_graph.execution_tracker') as mock_tracker:
        
        # Mock service to raise exception
        mock_service.return_value.classify = AsyncMock(side_effect=Exception("Classification failed"))
        mock_tracker.start_execution = AsyncMock(return_value=Mock(execution_id="exec-error-123"))
        mock_tracker.start_node = AsyncMock()
        mock_tracker.fail_node = AsyncMock()
        mock_tracker.complete_execution = AsyncMock()
        
        result = await sta_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert len(result["errors"]) > 0
    assert "Classification failed" in result["errors"][0]
    mock_tracker.fail_node.assert_called()


# ============================================================================
# Test: Conditional Routing Logic
# ============================================================================

@pytest.mark.asyncio
async def test_sta_routing_critical_escalates_to_sda(sta_service, mock_db_session):
    """
    Test decide_routing function: CRITICAL severity → "escalate_sda".
    """
    # Arrange
    message = "I'm going to jump off a bridge"
    
    mock_classification = {
        "risk_level": 3,
        "risk_score": 0.98,
        "severity": "critical",
        "intent": "self_harm",
        "next_step": "escalate_sda"
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        result = await sta_service.execute(
            user_id=9,
            session_id="test-routing-666",
            user_hash="hash-666",
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert result["next_step"] == "escalate_sda"
    assert result["severity"] == "critical"


@pytest.mark.asyncio
async def test_sta_routing_moderate_routes_to_sca(sta_service, mock_db_session):
    """
    Test decide_routing function: MODERATE severity + support_seeking → "route_sca".
    """
    # Arrange
    message = "I'm feeling really depressed lately"
    
    mock_classification = {
        "risk_level": 2,
        "risk_score": 0.65,
        "severity": "moderate",
        "intent": "support_seeking",
        "next_step": "route_sca"
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        result = await sta_service.execute(
            user_id=10,
            session_id="test-routing-777",
            user_hash="hash-777",
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert result["next_step"] == "route_sca"
    assert result["severity"] == "moderate"


@pytest.mark.asyncio
async def test_sta_routing_low_ends_workflow(sta_service, mock_db_session):
    """
    Test decide_routing function: LOW severity → "end" (no further agents).
    """
    # Arrange
    message = "How can I improve my focus?"
    
    mock_classification = {
        "risk_level": 0,
        "risk_score": 0.08,
        "severity": "low",
        "intent": "information_seeking",
        "next_step": "end"
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.get_safety_triage_service') as mock_service:
        mock_service.return_value.classify = AsyncMock(return_value=mock_classification)
        result = await sta_service.execute(
            user_id=11,
            session_id="test-routing-888",
            user_hash="hash-888",
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert result["next_step"] == "end"
    assert result["severity"] == "low"

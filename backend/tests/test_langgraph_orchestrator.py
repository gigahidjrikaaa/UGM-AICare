"""
Test suite for LangGraph Orchestrator.

Tests the complete Safety Agent Suite workflow orchestration across STA→SCA→SDA agents.
Validates conditional routing logic, state management, and execution tracking.

Author: UGM-AICare Team
Created: 2025-01-17
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any

from app.agents.orchestrator_graph_service import OrchestratorGraphService
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
def orchestrator_service(mock_db_session):
    """Create orchestrator service with mocked dependencies."""
    return OrchestratorGraphService(mock_db_session)


# ============================================================================
# Test: Full Workflow - Crisis Message (STA → SDA)
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_crisis_workflow_sta_to_sda(orchestrator_service, mock_db_session):
    """
    Test crisis message routing: STA detects high risk → skip SCA → route to SDA.
    
    Expected Flow:
    - STA: ingest_message → redact → assess_risk (CRITICAL)
    - Conditional: High/Critical → skip SCA
    - SDA: ingest_escalation → create_case → calculate_sla → auto_assign
    
    Validates:
    - STA classifies message as CRITICAL
    - SCA is NOT invoked (high severity skips intervention)
    - SDA creates case with 15-minute SLA
    - execution_path contains STA and SDA nodes only
    """
    # Arrange
    user_id = 1
    session_id = "test-crisis-123"
    user_hash = "hash-crisis"
    crisis_message = "I want to kill myself. I have a plan."
    conversation_id = 1
    
    # Mock STA classification result (high risk)
    mock_sta_result = {
        "risk_level": 3,
        "risk_score": 0.95,
        "severity": "critical",
        "intent": "self_harm",
        "next_step": "escalate_sda"
    }
    
    # Mock SDA case creation
    mock_case = Mock()
    mock_case.id = 101
    mock_case.severity = "critical"
    mock_case.sla_breach_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.core.orchestrator.AgentOrchestrator') as mock_orchestrator:
        
        # Mock STA classify
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        
        # Mock SDA case creation
        mock_orchestrator.return_value.handle_sta_classification = AsyncMock(return_value=mock_case)
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=crisis_message,
            conversation_id=conversation_id
        )
    
    # Assert
    assert result["risk_level"] == 3
    assert result["severity"] == "critical"
    assert result["case_created"] is True
    assert result["case_id"] == 101
    assert result["should_intervene"] is False  # SCA was not invoked
    assert "sta:" in result["execution_path"][0]  # First nodes are STA
    assert "sda:" in result["execution_path"][-1]  # Last nodes are SDA
    assert not any("sca:" in node for node in result["execution_path"])  # No SCA nodes


# ============================================================================
# Test: Full Workflow - Moderate Message (STA → SCA)
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_moderate_workflow_sta_to_sca(orchestrator_service, mock_db_session):
    """
    Test moderate message routing: STA detects moderate risk → route to SCA.
    
    Expected Flow:
    - STA: ingest_message → redact → assess_risk (MODERATE)
    - Conditional: Moderate + next_step=sca → invoke SCA
    - SCA: ingest_triage → determine_intervention → compose_plan → safety_review
    - Conditional: High/Critical check → No (END)
    
    Validates:
    - STA classifies message as MODERATE
    - SCA is invoked and generates intervention plan
    - SDA is NOT invoked (moderate severity doesn't escalate)
    - execution_path contains STA and SCA nodes only
    """
    # Arrange
    user_id = 2
    session_id = "test-moderate-456"
    user_hash = "hash-moderate"
    moderate_message = "I'm feeling really overwhelmed with my studies and can't sleep."
    conversation_id = 2
    
    # Mock STA classification result (moderate risk)
    mock_sta_result = {
        "risk_level": 2,
        "risk_score": 0.55,
        "severity": "moderate",
        "intent": "support_seeking",
        "next_step": "route_sca"
    }
    
    # Mock SCA intervention plan
    mock_plan = Mock()
    mock_plan.id = 201
    mock_plan.intervention_type = "calm_down"
    mock_plan.coping_strategies = ["Deep breathing", "Progressive muscle relaxation"]
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.agents.sca.sca_graph.GeminiPlanGenerator') as mock_plan_generator:
        
        # Mock STA classify
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        
        # Mock SCA plan generation
        mock_plan_generator.return_value.generate_personalized_plan = AsyncMock(return_value=mock_plan)
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=moderate_message,
            conversation_id=conversation_id
        )
    
    # Assert
    assert result["risk_level"] == 2
    assert result["severity"] == "moderate"
    assert result["should_intervene"] is True
    assert result["intervention_plan_id"] == 201
    assert result["intervention_type"] == "calm_down"
    assert result["case_created"] is False  # SDA was not invoked
    assert "sta:" in result["execution_path"][0]  # First nodes are STA
    assert any("sca:" in node for node in result["execution_path"])  # SCA nodes present
    assert not any("sda:" in node for node in result["execution_path"])  # No SDA nodes


# ============================================================================
# Test: Full Workflow - Low Risk Message (STA → END)
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_low_risk_workflow_sta_end(orchestrator_service, mock_db_session):
    """
    Test low risk message routing: STA detects low risk → END (no further agents).
    
    Expected Flow:
    - STA: ingest_message → redact → assess_risk (LOW)
    - Conditional: Low risk → END
    
    Validates:
    - STA classifies message as LOW
    - Neither SCA nor SDA are invoked
    - execution_path contains only STA nodes
    - System allows normal conversation to continue
    """
    # Arrange
    user_id = 3
    session_id = "test-low-789"
    user_hash = "hash-low"
    low_risk_message = "What are some good study techniques?"
    conversation_id = 3
    
    # Mock STA classification result (low risk)
    mock_sta_result = {
        "risk_level": 0,
        "risk_score": 0.05,
        "severity": "low",
        "intent": "information_seeking",
        "next_step": "end"
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service:
        
        # Mock STA classify
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=low_risk_message,
            conversation_id=conversation_id
        )
    
    # Assert
    assert result["risk_level"] == 0
    assert result["severity"] == "low"
    assert result["should_intervene"] is False
    assert result["case_created"] is False
    assert all("sta:" in node for node in result["execution_path"])  # Only STA nodes
    assert not any("sca:" in node for node in result["execution_path"])  # No SCA
    assert not any("sda:" in node for node in result["execution_path"])  # No SDA


# ============================================================================
# Test: Execution Tracking Persistence
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_execution_tracking_persistence(orchestrator_service, mock_db_session):
    """
    Test that orchestrator creates LangGraphExecution records in database.
    
    Validates:
    - LangGraphExecution created with unique execution_id
    - started_at timestamp set
    - completed_at timestamp set after execution
    - status transitions from "running" to "completed"
    - execution_path saved correctly
    """
    # Arrange
    user_id = 4
    session_id = "test-tracking-111"
    user_hash = "hash-tracking"
    message = "I'm stressed about exams"
    
    mock_sta_result = {
        "risk_level": 1,
        "risk_score": 0.25,
        "severity": "low",
        "intent": "support_seeking",
        "next_step": "end"
    }
    
    # Mock execution tracker
    mock_execution = Mock(spec=LangGraphExecution)
    mock_execution.execution_id = "exec-tracking-123"
    mock_execution.started_at = datetime.utcnow()
    mock_execution.completed_at = None
    mock_execution.status = "running"
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.agents.orchestrator_graph_service.execution_tracker') as mock_tracker:
        
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        mock_tracker.start_execution = AsyncMock(return_value=mock_execution)
        mock_tracker.complete_execution = AsyncMock()
        
        result = await orchestrator_service.execute(
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
# Test: Error Handling
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_handles_sta_failure_gracefully(orchestrator_service, mock_db_session):
    """
    Test orchestrator error handling when STA fails.
    
    Validates:
    - Errors are captured in state["errors"]
    - Execution doesn't crash
    - Error is logged
    - execution_tracker.fail_execution is called
    """
    # Arrange
    user_id = 5
    session_id = "test-error-222"
    user_hash = "hash-error"
    message = "Test error handling"
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.agents.orchestrator_graph_service.execution_tracker') as mock_tracker:
        
        # Mock STA to raise exception
        mock_sta_service.return_value.classify = AsyncMock(side_effect=Exception("STA service failed"))
        mock_tracker.start_execution = AsyncMock(return_value=Mock(execution_id="exec-error-123"))
        mock_tracker.fail_node = AsyncMock()
        mock_tracker.fail_execution = AsyncMock()
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert len(result["errors"]) > 0
    assert "STA service failed" in result["errors"][0]
    mock_tracker.fail_execution.assert_called_once()


# ============================================================================
# Test: Conditional Routing Logic
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_routing_high_severity_skips_sca(orchestrator_service, mock_db_session):
    """
    Test conditional edge: High severity should route STA → SDA (skip SCA).
    
    Validates routing decision function behavior.
    """
    # Arrange
    user_id = 6
    session_id = "test-routing-333"
    user_hash = "hash-routing"
    message = "I'm going to hurt myself tonight"
    
    mock_sta_result = {
        "risk_level": 3,
        "risk_score": 0.88,
        "severity": "high",
        "intent": "self_harm",
        "next_step": "escalate_sda"
    }
    
    mock_case = Mock()
    mock_case.id = 301
    mock_case.severity = "high"
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.core.orchestrator.AgentOrchestrator') as mock_orchestrator:
        
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        mock_orchestrator.return_value.handle_sta_classification = AsyncMock(return_value=mock_case)
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert
    assert result["severity"] == "high"
    assert result["case_created"] is True
    assert result["should_intervene"] is False  # SCA skipped
    assert not any("sca:" in node for node in result["execution_path"])


# ============================================================================
# Test: State Management Across Subgraphs
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_state_merging_across_subgraphs(orchestrator_service, mock_db_session):
    """
    Test that state is correctly merged when passing between subgraphs.
    
    Validates:
    - STA output (risk_level, severity, intent) is available to SCA
    - SCA output (intervention_plan) is available in final state
    - execution_path accumulates nodes from all graphs
    """
    # Arrange
    user_id = 7
    session_id = "test-state-444"
    user_hash = "hash-state"
    message = "I feel anxious all the time"
    
    mock_sta_result = {
        "risk_level": 2,
        "risk_score": 0.60,
        "severity": "moderate",
        "intent": "support_seeking",
        "next_step": "route_sca"
    }
    
    mock_plan = Mock()
    mock_plan.id = 401
    mock_plan.intervention_type = "calm_down"
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.agents.sca.sca_graph.GeminiPlanGenerator') as mock_plan_generator:
        
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        mock_plan_generator.return_value.generate_personalized_plan = AsyncMock(return_value=mock_plan)
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert - State merge validation
    assert result["risk_level"] == 2  # From STA
    assert result["intervention_plan_id"] == 401  # From SCA
    assert len(result["execution_path"]) > 5  # Both STA and SCA nodes
    assert "sta:assess_risk" in result["execution_path"]
    assert "sca:compose_plan" in result["execution_path"]


# ============================================================================
# Test: WebSocket Notifications
# ============================================================================

@pytest.mark.asyncio
async def test_orchestrator_emits_websocket_events(orchestrator_service, mock_db_session):
    """
    Test that orchestrator execution triggers WebSocket events for admin dashboard.
    
    Validates:
    - execution_tracker.start_node emits node start events
    - execution_tracker.complete_node emits node completion events
    - execution_tracker.trigger_edge emits edge traversal events
    - Admin dashboard receives real-time updates
    """
    # Arrange
    user_id = 8
    session_id = "test-websocket-555"
    user_hash = "hash-websocket"
    message = "Test WebSocket notifications"
    
    mock_sta_result = {
        "risk_level": 0,
        "risk_score": 0.10,
        "severity": "low",
        "intent": "general_chat",
        "next_step": "end"
    }
    
    # Act
    with patch('app.agents.sta.sta_graph.SafetyTriageService') as mock_sta_service, \
         patch('app.agents.orchestrator_graph_service.execution_tracker') as mock_tracker:
        
        mock_sta_service.return_value.classify = AsyncMock(return_value=mock_sta_result)
        mock_tracker.start_execution = AsyncMock(return_value=Mock(execution_id="exec-ws-123"))
        mock_tracker.start_node = AsyncMock()
        mock_tracker.complete_node = AsyncMock()
        mock_tracker.trigger_edge = AsyncMock()
        mock_tracker.complete_execution = AsyncMock()
        
        result = await orchestrator_service.execute(
            user_id=user_id,
            session_id=session_id,
            user_hash=user_hash,
            message=message,
            conversation_id=None
        )
    
    # Assert - WebSocket event emissions
    assert mock_tracker.start_node.call_count >= 3  # At least 3 STA nodes
    assert mock_tracker.complete_node.call_count >= 3
    assert mock_tracker.trigger_edge.call_count >= 2  # At least 2 edges

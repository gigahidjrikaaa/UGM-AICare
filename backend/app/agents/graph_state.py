"""Shared state schema for all LangGraph agent workflows.

This module defines the TypedDict state that flows through the Safety Agent Suite
graphs (STA, SCA, SDA, IA) and the master orchestrator.
"""
from __future__ import annotations

from typing import TypedDict, Optional, List, Dict, Any, Literal, NotRequired
from datetime import datetime


class SafetyAgentState(TypedDict, total=False):
    """Shared state across STA, SCA, SDA, and IA agents.
    
    This state flows through the LangGraph workflow, with each agent
    reading and writing relevant fields. All fields are optional to support
    incremental state building.
    
    Workflow:
        STA → populates risk assessment fields
        SCA → populates intervention plan fields (if needed)
        SDA → populates case management fields (if escalated)
        IA → consumes anonymized data for analytics
    """
    
    # ============================================================================
    # INPUT CONTEXT (Provided at workflow start)
    # ============================================================================
    user_id: int
    """User ID from database."""
    
    session_id: str
    """Session identifier for tracking user interactions."""
    
    user_hash: str
    """Anonymized user identifier for privacy."""
    
    message: str
    """Original user message content."""
    
    conversation_id: int
    """Conversation ID linking messages together."""
    
    # ============================================================================
    # STA (Safety Triage Agent) OUTPUTS
    # ============================================================================
    risk_level: int
    """Risk level from 0-3 (0=low, 1=moderate, 2=high, 3=critical)."""
    
    risk_score: float
    """Normalized risk score from 0.0 to 1.0."""
    
    severity: Literal["low", "moderate", "high", "critical"]
    """Human-readable severity classification."""
    
    intent: str
    """Detected user intent (e.g., 'general_chat', 'crisis', 'academic_stress')."""
    
    next_step: str
    """Routing decision: 'sca' (Support Coach), 'sda' (Service Desk), or 'end'."""
    
    redacted_message: Optional[str]
    """Message with PII redacted for safe storage and analytics."""
    
    triage_assessment_id: Optional[int]
    """Database ID of created TriageAssessment record."""
    
    # ============================================================================
    # SCA (Support Coach Agent) OUTPUTS
    # ============================================================================
    intervention_plan: Optional[Dict[str, Any]]
    """Generated intervention plan with steps and resources.
    
    Structure:
        {
            "plan_steps": [{"id": "step1", "label": "...", "duration_min": 5}],
            "resource_cards": [{"resource_id": "...", "title": "...", "url": "..."}]
        }
    """
    
    intervention_type: Optional[str]
    """Type of intervention: 'calm_down', 'break_down_problem', 'general_coping'."""
    
    should_intervene: bool
    """Flag indicating if SCA should create intervention (default False)."""
    
    intervention_plan_id: Optional[int]
    """Database ID of created InterventionPlan record."""
    
    # ============================================================================
    # SDA (Service Desk Agent) OUTPUTS
    # ============================================================================
    case_id: Optional[int]
    """Database ID of created Case record (for high/critical escalations)."""
    
    case_created: bool
    """Flag indicating if a new case was created (default False)."""
    
    case_severity: Optional[str]
    """Case severity level if case was created."""
    
    assigned_counsellor_id: Optional[int]
    """ID of counsellor assigned to case (if auto-assigned)."""
    
    sla_breach_at: Optional[str]
    """ISO timestamp of SLA breach deadline."""
    
    # ============================================================================
    # EXECUTION METADATA (Used by ExecutionStateTracker)
    # ============================================================================
    execution_id: str
    """Unique ID for this graph execution (for tracking and monitoring)."""
    
    errors: List[str]
    """List of error messages encountered during execution."""
    
    execution_path: List[str]
    """List of node IDs that have executed (for debugging and analytics)."""
    
    started_at: Optional[datetime]
    """Timestamp when graph execution started."""
    
    completed_at: Optional[datetime]
    """Timestamp when graph execution completed."""


class STAState(SafetyAgentState):
    """STA-specific state extension.
    
    Used by the Safety Triage Agent subgraph. Inherits all fields from
    SafetyAgentState but can be extended with STA-specific fields if needed.
    """
    pass


class SCAState(SafetyAgentState):
    """SCA-specific state extension.
    
    Used by the Support Coach Agent subgraph. Inherits all fields from
    SafetyAgentState but can be extended with SCA-specific fields if needed.
    """
    pass


class SDAState(SafetyAgentState):
    """SDA-specific state extension.
    
    Used by the Service Desk Agent subgraph. Inherits all fields from
    SafetyAgentState but can be extended with SDA-specific fields if needed.
    """
    pass


class OrchestratorState(SafetyAgentState):
    """Orchestrator-specific state extension.
    
    Used by the master orchestrator graph that coordinates STA→SCA→SDA flows.
    Inherits all fields from SafetyAgentState.
    """
    pass


class IAState(TypedDict, total=False):
    """IA (Insights Agent) specific state for analytics queries.
    
    This state is separate from SafetyAgentState because IA performs
    privacy-preserving analytics aggregation, not individual user support.
    
    Privacy Safeguards:
    - K-anonymity enforcement (k ≥ 5)
    - Allow-listed queries only
    - Consent validation
    - Differential privacy budget tracking
    """
    
    # Query parameters
    question_id: str
    """ID of allow-listed analytics question (e.g., 'crisis_trend')."""
    
    start_date: datetime
    """Query start date for analytics aggregation."""
    
    end_date: datetime
    """Query end date for analytics aggregation."""
    
    user_hash: str
    """Anonymized identifier of analyst requesting query."""
    
    # Privacy enforcement flags
    query_validated: bool
    """Whether query parameters passed validation."""
    
    consent_validated: bool
    """Whether data access consent was validated."""
    
    privacy_enforced: bool
    """Whether k-anonymity/differential privacy was applied."""
    
    k_threshold: int
    """K-anonymity threshold (minimum group size for results)."""
    
    query_completed: bool
    """Whether analytics query completed successfully."""
    
    # Results
    analytics_result: Dict[str, Any]
    """Analytics query results (chart, table, notes)."""
    
    # Execution tracking
    execution_id: str
    """Unique identifier for this graph execution."""
    
    execution_path: List[str]
    """List of node names executed in order."""
    
    errors: List[str]
    """List of error messages encountered during execution."""
    
    started_at: datetime
    """Timestamp when execution started."""
    
    completed_at: datetime
    """Timestamp when execution completed."""


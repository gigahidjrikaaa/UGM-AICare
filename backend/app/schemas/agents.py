from pydantic import BaseModel
from typing import List, Dict, Any

# --- Triage Agent Schemas ---

class TriageMessage(BaseModel):
    """Represents a single message in a conversation for triage."""
    role: str
    content: str


class TriageRequest(BaseModel):
    """Request model for richer triage assessments (reserved for future use)."""
    messages: List[TriageMessage]
    user_id: int
    session_id: str


class TriageResponse(BaseModel):
    """Response model for a detailed triage assessment payload."""
    assessment_id: int
    risk_score: float
    confidence_score: float
    severity_level: str
    risk_factors: List[str]
    protective_factors: List[str]
    recommendations: Dict[str, Any]
    escalation: Dict[str, Any]


class TriageClassifyRequest(BaseModel):
    """Lightweight request for the current triage classification endpoint."""
    message: str


class TriageClassifyResponse(BaseModel):
    """Simplified response returned by the triage classification endpoint."""
    classification: str
    recommended_resources: List[Dict[str, Any]]


class LangGraphNode(BaseModel):
    """Node representation for LangGraph state inspection."""
    id: str
    type: str
    data: Dict[str, Any]


class LangGraphEdge(BaseModel):
    """Edge representation for LangGraph state inspection."""
    source: str
    target: str
    data: Dict[str, Any] | None = None


class LangGraphState(BaseModel):
    """Full LangGraph state including nodes and edges."""
    nodes: List[LangGraphNode]
    edges: List[LangGraphEdge]

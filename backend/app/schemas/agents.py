from pydantic import BaseModel
from typing import List, Dict, Any

# --- Triage Agent Schemas ---

class TriageMessage(BaseModel):
    """Represents a single message in a conversation for triage."""
    role: str
    content: str

class TriageRequest(BaseModel):
    """Request model for the Triage Agent's classification endpoint."""
    messages: List[TriageMessage]
    user_id: int
    session_id: str

class TriageResponse(BaseModel):
    """Response model for a Triage Agent assessment."""
    assessment_id: int
    risk_score: float
    confidence_score: float
    severity_level: str
    risk_factors: List[str]
    protective_factors: List[str]
    recommendations: Dict[str, Any]
    escalation: Dict[str, Any]
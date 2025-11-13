"""
Aika Meta-Agent API Router

Provides unified endpoint for the Aika Meta-Agent orchestrator.
Uses the NEW unified LangGraph orchestrator with Aika as first decision node.

Endpoint: POST /api/v1/aika
"""

import logging
from typing import Any, Dict, List, Literal, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.checkpoint.memory import MemorySaver

from app.database import get_async_db
from app.core.auth import get_current_user
from app.models.user import User
from app.agents.aika_orchestrator_graph import create_aika_agent_with_checkpointing

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/aika",
    tags=["Aika Meta-Agent"],
)


# Request/Response Models
class AikaMessage(BaseModel):
    """Message in conversation history"""
    role: Literal["user", "assistant"]
    content: str
    timestamp: Optional[str] = None


class AikaRiskAssessment(BaseModel):
    """Risk assessment from STA"""
    risk_level: Literal["low", "moderate", "high", "critical"]
    risk_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_factors: List[str] = Field(default_factory=list)


class AikaMetadata(BaseModel):
    """Metadata about Aika's processing"""
    session_id: str
    user_role: Literal["user", "admin", "counselor"]
    intent: str
    agents_invoked: List[str] = Field(default_factory=list)
    actions_taken: List[str] = Field(default_factory=list)
    processing_time_ms: float
    risk_assessment: Optional[AikaRiskAssessment] = None
    escalation_triggered: bool = False
    case_id: Optional[str] = None


class AikaRequest(BaseModel):
    """Request to Aika Meta-Agent"""
    user_id: int
    role: Literal["user", "admin", "counselor"] = "user"
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_history: List[AikaMessage] = Field(default_factory=list)


class AikaResponse(BaseModel):
    """Response from Aika Meta-Agent"""
    success: bool
    response: str
    metadata: AikaMetadata
    intervention_plan: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@router.post("", response_model=AikaResponse)
async def process_aika_message(
    request: AikaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> AikaResponse:
    """
    Process a message through the Aika Meta-Agent orchestrator.
    
    This endpoint:
    1. Classifies user intent based on role and message
    2. Routes to appropriate specialized agents (STA, SCA, SDA, IA)
    3. Orchestrates multi-agent workflows via LangGraph
    4. Returns unified response with Aika's personality
    
    **Role-based flows:**
    - **Students (user)**: STA → SCA → [SDA if crisis] → IA (background)
    - **Admins**: Intent → IA (analytics) or SDA (actions)
    - **Counselors**: SDA (cases) → IA (insights) → SCA (recommendations)
    
    **Example request:**
    ```json
    {
      "user_id": 123,
      "role": "user",
      "message": "I'm feeling stressed about exams",
      "conversation_history": [
        {"role": "user", "content": "Hi", "timestamp": "2025-11-04T10:00:00"},
        {"role": "assistant", "content": "Hello! How are you?", "timestamp": "2025-11-04T10:00:01"}
      ]
    }
    ```
    
    **Example response:**
    ```json
    {
      "success": true,
      "response": "I understand exam stress can be overwhelming. Let's work through this together...",
      "metadata": {
        "session_id": "sess_123_1699099200",
        "user_role": "user",
        "intent": "seeking_support",
        "agents_invoked": ["STA", "SCA"],
        "actions_taken": ["assess_risk", "provide_cbt_coaching"],
        "processing_time_ms": 1234.56,
        "risk_assessment": {
          "risk_level": "low",
          "risk_score": 0.25,
          "confidence": 0.89,
          "risk_factors": ["academic_stress"]
        },
        "escalation_triggered": false
      }
    }
    ```
    """
    try:
        # Validate user authorization
        if int(current_user.id) != request.user_id:
            logger.warning(
                f"User {current_user.id} attempted to send message as user {request.user_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only send messages as yourself",
            )
        
        # Initialize Aika agent with checkpointing (NEW: Direct LangGraph invocation)
        logger.info(
            f"🤖 Processing Aika request via unified orchestrator: "
            f"user={request.user_id}, role={request.role}, msg_len={len(request.message)}"
        )
        
        start_time = datetime.now()
        
        # Create Aika agent with in-memory checkpointing
        memory = MemorySaver()
        aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=memory)
        
        # Convert conversation history to dict format
        conversation_history = [
            {
                "role": msg.role,
                "content": msg.content,
            }
            for msg in request.conversation_history
        ]
        
        # Generate session ID
        session_id = f"sess_{request.user_id}_{int(datetime.now().timestamp())}"
        
        # Prepare initial state for LangGraph
        initial_state = {
            "user_id": request.user_id,
            "user_role": request.role,
            "message": request.message,
            "conversation_history": conversation_history,
            "session_id": session_id,
        }
        
        # Invoke Aika agent directly (no wrapper - agentic pattern!)
        result = await aika_agent.ainvoke(
            initial_state,
            config={
                "configurable": {
                    "thread_id": f"user_{request.user_id}_session_{session_id}"
                }
            }
        )
        
        # Calculate processing time
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Extract results from LangGraph state
        final_response = result.get("final_response", "Maaf, terjadi kesalahan.")
        response_source = result.get("response_source", "unknown")
        agents_invoked = result.get("agents_invoked", [])
        execution_path = result.get("execution_path", [])
        
        # Build metadata response
        metadata = AikaMetadata(
            session_id=session_id,
            user_role=request.role,
            intent=result.get("intent", "general_conversation"),
            agents_invoked=agents_invoked,
            actions_taken=execution_path,
            processing_time_ms=processing_time_ms,
            escalation_triggered=result.get("case_created", False),
            case_id=str(result.get("case_id")) if result.get("case_id") else None,
        )
        
        # Add risk assessment if STA was invoked
        if "STA" in agents_invoked and result.get("severity"):
            metadata.risk_assessment = AikaRiskAssessment(
                risk_level=result.get("severity", "low"),
                risk_score=result.get("risk_score", 0.0),
                confidence=result.get("intent_confidence", 0.0),
                risk_factors=result.get("risk_factors", []),
            )
        
        logger.info(
            f"✅ Aika unified orchestrator: user={request.user_id}, "
            f"source={response_source}, agents={agents_invoked}, "
            f"time={processing_time_ms:.2f}ms"
        )
        
        # Extract intervention plan if available (from SCA)
        intervention_plan = result.get("intervention_plan")
        
        return AikaResponse(
            success=True,
            response=final_response,
            metadata=metadata,
            intervention_plan=intervention_plan,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Aika orchestration failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Aika processing failed: {str(e)}",
        )


@router.get("/health")
async def aika_health() -> dict:
    """
    Health check for Aika Meta-Agent.
    
    Returns:
        Status of Aika orchestrator and dependent services.
    """
    return {
        "status": "healthy",
        "service": "Aika Meta-Agent",
        "version": "2.0.0",
        "orchestrator": "LangGraph",
        "agents": {
            "STA": "Safety Triage Agent",
            "SCA": "Support Coach Agent",
            "SDA": "Service Desk Agent",
            "IA": "Insights Agent",
        },
    }

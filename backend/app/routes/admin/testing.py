"""Testing endpoints for admin panel - simulate users and conversations.

# pyright: reportMissingImports=false, reportOptionalMemberAccess=false
"""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_async_db
from app.dependencies import get_admin_user
from app.models import User  # Core model
from app.domains.mental_health.models import Conversation, Message
from app.domains.mental_health.models.messages import MessageRoleEnum
from app.agents.sta.service import SafetyTriageService
from app.domains.mental_health.schemas.chat import ChatRequest, ChatResponse
# from app.domains.mental_health.services.chat_processing import process_chat_message
from app.domains.mental_health.services.personal_context import build_user_personal_context

# Chat processing is not yet implemented - use stub that raises NotImplementedError
try:
    from app.domains.mental_health.services.chat_processing import process_chat_message
except ImportError:
    # Fallback to stub function
    async def process_chat_message(*args, **kwargs):
        raise NotImplementedError(
            "chat_processing module not yet implemented. "
            "This endpoint requires the chat_processing service to be developed."
        )

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin - Testing"], prefix="/testing")

# Severity mapping for STA
_SEVERITY_MAP: dict[int, str] = {
    0: "low",
    1: "moderate",
    2: "high",
    3: "critical",
}


# --- Schemas ---
class CreateTestUserRequest(BaseModel):
    """Request to create a test user."""
    email: Optional[EmailStr] = None
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="user", pattern="^(user|counselor|admin)$")
    university: Optional[str] = "Universitas Gadjah Mada"
    major: Optional[str] = None
    year_of_study: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = "Yogyakarta"


class CreateTestUserResponse(BaseModel):
    """Response with created user details."""
    user_id: int
    email: str
    name: str
    role: str
    created_at: str


class SimulateConversationRequest(BaseModel):
    """Request to simulate a conversation."""
    user_id: int
    messages: List[str] = Field(..., min_length=1, max_length=20, description="List of user messages")
    risk_level: Optional[str] = Field(None, pattern="^(low|med|high|critical)$")
    auto_classify: bool = Field(default=True, description="Automatically classify with STA")
    simulate_real_chat: bool = Field(default=False, description="Simulate real chat with AI responses via /chat endpoint")


class SimulateRealChatRequest(BaseModel):
    """Request to simulate a real chat conversation."""
    user_id: int
    user_messages: List[str] = Field(..., min_length=1, max_length=20, description="List of user messages to send sequentially")
    enable_sta: bool = Field(default=True, description="Enable STA risk analysis in chat flow")
    enable_sca: bool = Field(default=True, description="Enable SCA intervention generation")


class ConversationMessage(BaseModel):
    """Single conversation message."""
    role: str
    content: str
    timestamp: str


class SimulateConversationResponse(BaseModel):
    """Response with conversation details."""
    conversation_id: str
    session_id: str
    user_id: int
    messages_created: int
    conversations_created: int
    classification: Optional[dict] = None
    case_created: Optional[bool] = None


class SimulateRealChatResponse(BaseModel):
    """Response from real chat simulation."""
    session_id: str
    user_id: int
    conversation_turns: int
    ai_responses: List[str]
    risk_assessment: Optional[Dict] = None
    intervention_generated: bool = False
    case_created: bool = False
    final_history: List[Dict[str, str]]


class ListTestUsersResponse(BaseModel):
    """Response with list of test users."""
    users: List[dict]
    total: int


class DeleteTestDataRequest(BaseModel):
    """Request to delete test data."""
    user_ids: Optional[List[int]] = Field(None, description="Specific user IDs to delete")
    delete_all_test_users: bool = Field(default=False, description="Delete all users with email containing 'test'")
    delete_conversations: bool = Field(default=True, description="Also delete conversations")


class DeleteTestDataResponse(BaseModel):
    """Response after deleting test data."""
    users_deleted: int
    conversations_deleted: int
    messages_deleted: int


# --- Endpoints ---
@router.post("/users", response_model=CreateTestUserResponse, status_code=status.HTTP_201_CREATED)
async def create_test_user(
    request: CreateTestUserRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> CreateTestUserResponse:
    """Create a test user with randomized data."""
    logger.info(f"Admin {admin_user.id} creating test user: {request.name}")

    # Generate email if not provided
    if not request.email:
        random_suffix = secrets.token_hex(4)
        sanitized_name = request.name.lower().replace(" ", ".")
        request.email = f"{sanitized_name}.test.{random_suffix}@ugm.ac.id"

    # Check if email already exists
    result = await db.execute(select(User).where(User.email == request.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {request.email} already exists"
        )

    # Create new user
    new_user = User(
        email=request.email,
        name=request.name,
        first_name=request.name.split()[0] if " " in request.name else request.name,
        last_name=request.name.split()[-1] if " " in request.name and len(request.name.split()) > 1 else None,
        role=request.role,
        university=request.university,
        major=request.major,
        year_of_study=request.year_of_study,
        gender=request.gender,
        city=request.city,
        is_active=True,
        email_verified=True,
        created_at=datetime.now(),
        google_sub=f"test_{secrets.token_hex(16)}",  # Fake Google sub for testing
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"Test user created: ID={new_user.id}, Email={new_user.email}")

    return CreateTestUserResponse(
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name or "",
        role=new_user.role,
        created_at=new_user.created_at.isoformat() if new_user.created_at else datetime.now().isoformat(),
    )


@router.post("/chat-simulation", response_model=SimulateRealChatResponse, status_code=status.HTTP_201_CREATED)
async def simulate_real_chat(
    request: SimulateRealChatRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> SimulateRealChatResponse:
    """
    Simulate a real user conversation by calling the chat endpoint.
    
    This endpoint simulates how a real user would interact with Aika:
    1. Each message is sent through the actual /chat endpoint
    2. AI generates real responses (not pre-written)
    3. STA analyzes risk in the background
    4. Cases are auto-created for high/critical risks
    5. Full conversation history is maintained
    
    This provides realistic testing of the entire chat flow including agent integration.
    """
    logger.info(f"Admin {admin_user.id} simulating real chat for user {request.user_id}")

    # Verify user exists
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {request.user_id} not found"
        )

    # Generate session IDs
    session_id = str(uuid.uuid4())
    conversation_id = str(uuid.uuid4())

    # Build conversation history
    history: List[Dict[str, str]] = []
    ai_responses: List[str] = []
    
    # Track agent results
    final_risk_assessment = None
    intervention_generated = False
    case_created = False

    # Import required functions
    # process_chat_message already imported at module level
    from app.domains.mental_health.services.personal_context import build_user_personal_context
    from app.core import llm
    
    # Default LLM responder without tool calling (for simplicity)
    async def _default_llm_responder(
        history_for_llm: List[Dict[str, str]],
        system_prompt: Optional[str],
        _request: ChatRequest,
        _stream_callback = None,
    ) -> str:
        """Simple LLM responder for testing."""
        model_name = "gemini_google"
        return await llm.generate_response(
            history=history_for_llm,
            model=model_name,
            max_tokens=1024,
            temperature=0.7,
            system_prompt=system_prompt,
        )

    # Get user's personal context
    personal_context = await build_user_personal_context(db, user)
    
    # System prompt
    system_prompt = """Kamu adalah Aika, AI pendamping kesehatan mental dari UGM-AICare. Anggap dirimu sebagai teman dekat bagi mahasiswa UGM yang sedang butuh teman cerita. Gunakan bahasa Indonesia yang santai dan kasual (gaya obrolan sehari-hari), jangan terlalu formal, kaku, atau seperti robot. Buat suasana ngobrol jadi nyaman dan nggak canggung (awkward). Sebisa mungkin, sesuaikan juga gaya bahasamu dengan yang dipakai pengguna.

Tujuan utamamu adalah menjadi pendengar yang baik, suportif, hangat, dan tidak menghakimi. Bantu pengguna mengeksplorasi perasaan mereka terkait kehidupan kuliah, stres, pertemanan, atau apapun yang ada di pikiran mereka. Validasi emosi mereka, tunjukkan kalau kamu paham dan peduli."""

    if personal_context:
        system_prompt = f"{system_prompt}\n\n{personal_context}"

    # Simulate each message
    for idx, user_message in enumerate(request.user_messages):
        logger.info(f"Processing message {idx + 1}/{len(request.user_messages)}: {user_message[:50]}...")
        
        try:
            # Create a ChatRequest
            chat_request = ChatRequest(
                google_sub=user.google_sub or f"test_{user.id}",
                session_id=session_id,
                conversation_id=conversation_id,
                message=user_message,
                history=history.copy(),
                provider="gemini",
                model="gemini_google",
                system_prompt=system_prompt,
            )
            
            # Process through actual chat flow
            result = await process_chat_message(
                request=chat_request,
                current_user=user,
                db=db,
                session_id=session_id,
                conversation_id=conversation_id,
                active_system_prompt=system_prompt,
                schedule_summary=None,
                summarize_now=None,
                llm_responder=_default_llm_responder,
            )
            
            # Extract AI response
            ai_response = result.response_text
            ai_responses.append(ai_response)
            
            # Update history
            history = result.final_history.copy()
            
            # Check for intervention plan (from agent integration)
            if result.intervention_plan:
                intervention_generated = True
                logger.info(f"Intervention plan generated for user {request.user_id}")
            
            logger.info(f"Message {idx + 1} processed. AI responded with {len(ai_response)} characters")
            
        except Exception as e:
            logger.error(f"Error processing message {idx + 1}: {e}", exc_info=True)
            # Add error response to maintain conversation flow
            ai_responses.append(f"[Simulation Error: {str(e)}]")
            history.append({"role": "user", "content": user_message})
            history.append({"role": "assistant", "content": f"[Error: {str(e)}]"})

    # After all messages, check if a case was created (from STA classification)
    # Query for recent triage assessments for this session
    from app.domains.mental_health.models import TriageAssessment, Case
    from sqlalchemy import desc
    
    triage_result = await db.execute(
        select(TriageAssessment)
        .where(TriageAssessment.user_id == request.user_id)
        .order_by(desc(TriageAssessment.created_at))
        .limit(1)
    )
    latest_triage = triage_result.scalar_one_or_none()
    
    if latest_triage:
        final_risk_assessment = {
            "severity": latest_triage.severity_level,
            "confidence": latest_triage.confidence_score,
            "risk_factors": latest_triage.risk_factors,
            "recommended_action": latest_triage.recommended_action,
        }
        
        # Check if case was created
        # Case model uses user_hash (not user_id), so we query by session_id
        case_result = await db.execute(
            select(Case)
            .where(Case.session_id == session_id)
            .order_by(desc(Case.created_at))
            .limit(1)
        )
        case = case_result.scalar_one_or_none()
        case_created = case is not None
        
        if case_created:
            logger.info(f"Case #{case.id} was created from this simulation (severity: {latest_triage.severity_level})")

    logger.info(
        f"Real chat simulation completed: session={session_id}, "
        f"turns={len(request.user_messages)}, case_created={case_created}"
    )

    return SimulateRealChatResponse(
        session_id=session_id,
        user_id=request.user_id,
        conversation_turns=len(request.user_messages),
        ai_responses=ai_responses,
        risk_assessment=final_risk_assessment,
        intervention_generated=intervention_generated,
        case_created=case_created,
        final_history=history,
    )


@router.post("/conversations", response_model=SimulateConversationResponse, status_code=status.HTTP_201_CREATED)
async def simulate_conversation(
    request: SimulateConversationRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> SimulateConversationResponse:
    """Simulate a conversation for a user with auto-classification."""
    logger.info(f"Admin {admin_user.id} simulating conversation for user {request.user_id}")

    # Verify user exists
    result = await db.execute(select(User).where(User.id == request.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {request.user_id} not found"
        )

    # Generate IDs
    session_id = str(uuid.uuid4())
    conversation_id = str(uuid.uuid4())

    # Create conversations (old model)
    conversations_created = 0
    for idx, user_message in enumerate(request.messages):
        # Generate AI response
        ai_response = f"Thank you for sharing that. I understand you're experiencing {user_message[:50]}... Let me help you with that."
        
        conversation = Conversation(
            user_id=request.user_id,
            session_id=session_id,
            conversation_id=conversation_id,
            message=user_message,
            response=ai_response,
            timestamp=datetime.now() - timedelta(minutes=len(request.messages) - idx)
        )
        db.add(conversation)
        conversations_created += 1

    # Create messages (new model)
    messages_created = 0
    for idx, user_message in enumerate(request.messages):
        # User message
        user_msg = Message(
            id=uuid.uuid4(),
            session_id=session_id,
            role=MessageRoleEnum.user,
            content_redacted=user_message,
            ts=datetime.now() - timedelta(minutes=len(request.messages) - idx),
        )
        db.add(user_msg)
        messages_created += 1

        # Assistant response
        ai_response = f"Thank you for sharing that. I understand you're experiencing {user_message[:50]}... Let me help you with that."
        assistant_msg = Message(
            id=uuid.uuid4(),
            session_id=session_id,
            role=MessageRoleEnum.assistant,
            content_redacted=ai_response,
            ts=datetime.now() - timedelta(minutes=len(request.messages) - idx - 0.5),
        )
        db.add(assistant_msg)
        messages_created += 1

    await db.commit()

    # Auto-classify with STA if requested
    classification = None
    case_created = None
    
    if request.auto_classify:
        try:
            # Import STA classifier
            from app.agents.sta.classifiers import SafetyTriageClassifier
            from app.agents.sta.schemas import STAClassifyRequest
            from app.domains.mental_health.services.agent_orchestrator import AgentOrchestrator
            
            classifier = SafetyTriageClassifier()
            orchestrator = AgentOrchestrator(db)
            sta_service = SafetyTriageService(
                classifier=classifier,
                session=db,
                orchestrator=orchestrator,
            )
            
            # Build full conversation text
            full_conversation = "\n".join([
                f"User: {msg}" for msg in request.messages
            ])
            
            # Classify
            sta_request = STAClassifyRequest(
                session_id=session_id,
                text=full_conversation,
                meta={"user_id": request.user_id, "conversation_id": conversation_id}
            )
            sta_response = await sta_service.classify(payload=sta_request)
            
            # Query for the created triage assessment
            from app.domains.mental_health.models import TriageAssessment
            from sqlalchemy import desc
            
            triage_result = await db.execute(
                select(TriageAssessment)
                .where(TriageAssessment.user_id == request.user_id)
                .order_by(desc(TriageAssessment.created_at))
                .limit(1)
            )
            triage_assessment = triage_result.scalar_one_or_none()
            
            if triage_assessment:
                classification = {
                    "severity": triage_assessment.severity_level,
                    "confidence": triage_assessment.confidence_score,
                    "risk_factors": triage_assessment.risk_factors or [],
                    "recommended_action": triage_assessment.recommended_action,
                    "risk_level": sta_response.risk_level,
                    "intent": sta_response.intent,
                    "next_step": sta_response.next_step,
                }
                
                # Check if case was created (high/critical)
                case_created = triage_assessment.severity_level in ["high", "critical"]
                
                logger.info(f"STA classification: {classification['severity']} (confidence: {classification['confidence']})")
            else:
                classification = {"error": "Classification completed but assessment not found"}
                case_created = False
            
        except Exception as e:
            logger.error(f"STA classification failed: {e}", exc_info=True)
            classification = {"error": str(e)}

    logger.info(
        f"Conversation simulated: session={session_id}, "
        f"conversations={conversations_created}, messages={messages_created}"
    )

    return SimulateConversationResponse(
        conversation_id=conversation_id,
        session_id=session_id,
        user_id=request.user_id,
        messages_created=messages_created,
        conversations_created=conversations_created,
        classification=classification,
        case_created=case_created,
    )


@router.get("/users", response_model=ListTestUsersResponse)
async def list_test_users(
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> ListTestUsersResponse:
    """List all test users (emails containing 'test')."""
    logger.info(f"Admin {admin_user.id} requesting test users list")

    result = await db.execute(
        select(User)
        .where(User.email.ilike("%test%"))
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    users_data = [
        {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "university": user.university,
            "major": user.major,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }
        for user in users
    ]

    return ListTestUsersResponse(
        users=users_data,
        total=len(users_data)
    )


@router.delete("/cleanup", response_model=DeleteTestDataResponse)
async def delete_test_data(
    request: DeleteTestDataRequest,
    db: AsyncSession = Depends(get_async_db),
    admin_user: User = Depends(get_admin_user),
) -> DeleteTestDataResponse:
    """Delete test users and their associated data."""
    logger.warning(f"Admin {admin_user.id} deleting test data: {request.dict()}")

    users_deleted = 0
    conversations_deleted = 0
    messages_deleted = 0

    # Determine which users to delete
    user_ids_to_delete = []
    
    if request.delete_all_test_users:
        result = await db.execute(
            select(User.id).where(User.email.ilike("%test%"))
        )
        user_ids_to_delete = [row[0] for row in result.fetchall()]
    elif request.user_ids:
        user_ids_to_delete = request.user_ids

    if not user_ids_to_delete:
        return DeleteTestDataResponse(
            users_deleted=0,
            conversations_deleted=0,
            messages_deleted=0
        )

    # Delete conversations first (if requested)
    if request.delete_conversations:
        for user_id in user_ids_to_delete:
            # Get session IDs from conversations
            conv_result = await db.execute(
                select(Conversation.session_id)
                .where(Conversation.user_id == user_id)
                .distinct()
            )
            session_ids = [row[0] for row in conv_result.fetchall()]

            # Delete old conversations
            conv_delete_result = await db.execute(
                select(Conversation).where(Conversation.user_id == user_id)
            )
            convs_to_delete = conv_delete_result.scalars().all()
            for conv in convs_to_delete:
                await db.delete(conv)
                conversations_deleted += 1

            # Delete new messages
            for session_id in session_ids:
                msg_delete_result = await db.execute(
                    select(Message).where(Message.session_id == session_id)
                )
                msgs_to_delete = msg_delete_result.scalars().all()
                for msg in msgs_to_delete:
                    await db.delete(msg)
                    messages_deleted += 1

    # Delete users
    for user_id in user_ids_to_delete:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            await db.delete(user)
            users_deleted += 1

    await db.commit()

    logger.info(
        f"Test data deleted: users={users_deleted}, "
        f"conversations={conversations_deleted}, messages={messages_deleted}"
    )

    return DeleteTestDataResponse(
        users_deleted=users_deleted,
        conversations_deleted=conversations_deleted,
        messages_deleted=messages_deleted
    )

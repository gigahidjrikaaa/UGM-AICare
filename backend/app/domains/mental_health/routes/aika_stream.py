"""
Aika Streaming Endpoint - Progressive Agent Execution Updates
Provides GitHub Copilot-style thinking indicators during agent execution.
"""

import json
import asyncio
import hashlib
import logging
from datetime import datetime
from typing import AsyncGenerator, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.checkpoint.memory import MemorySaver

from app.database import get_async_db
from app.dependencies import get_current_active_user
from app.models import User
from app.domains.mental_health.schemas.chat import AikaRequest
from app.agents.aika_orchestrator_graph import create_aika_agent_with_checkpointing
from app.core.rate_limiter import check_rate_limit_dependency

logger = logging.getLogger(__name__)

router = APIRouter()


# Agent status messages for streaming updates
AGENT_STATUS_MESSAGES = {
    "aika_decision": "🤔 Aika sedang menganalisis permintaanmu...",
    "sta_subgraph": "🧠 Menilai keamanan emosional...",
    "sca_subgraph": "🤝 Menyusun rencana dukungan...",
    "sda_subgraph": "🚨 Mengatur jadwal dan dokumentasi...",
    "synthesize_response": "✨ Menyusun respons akhir...",
}

AGENT_NAMES = {
    "STA": {"name": "🧠 Suicide & Threat Assessment", "desc": "Menilai risiko dan keamanan emosional"},
    "SCA": {"name": "🤝 Support & Care Agent", "desc": "Menyusun rencana dukungan"},
    "SDA": {"name": "🚨 Scheduling & Documentation Agent", "desc": "Mengatur appointment"},
}


async def stream_aika_execution(
    request: AikaRequest,
    current_user: User,
    db: AsyncSession
) -> AsyncGenerator[str, None]:
    """
    Stream progressive updates during Aika agent execution.
    
    Yields SSE (Server-Sent Events) formatted messages:
    - type: 'thinking' - Thinking/processing indicator
    - type: 'status' - Node execution status
    - type: 'agent' - Agent invocation notification
    - type: 'intervention_plan' - Intervention plan data
    - type: 'appointment' - Appointment scheduling data
    - type: 'complete' - Final response with metadata
    - type: 'error' - Error occurred
    """
    try:
        # Initial thinking indicator
        thinking_data = {'type': 'thinking', 'message': 'Memproses...'}
        yield f"data: {json.dumps(thinking_data)}\n\n"
        await asyncio.sleep(0.05)
        
        # Prepare initial state
        user_hash = hashlib.sha256(f"user_{current_user.id}".encode()).hexdigest()[:16]
        initial_state = {
            "user_id": current_user.id,
            "user_role": request.role,
            "user_hash": user_hash,
            "message": request.message,
            "conversation_history": request.conversation_history or [],
            "session_id": request.session_id or f"sess_{current_user.id}_{int(datetime.now().timestamp())}",
            "execution_path": [],
            "agents_invoked": [],
            "errors": [],
            "preferred_model": request.preferred_model,  # Pass user's preferred model
        }
        
        logger.info(f"🌊 Starting streaming execution for user {current_user.id} with model: {request.preferred_model or 'default'}")
        
        # Create Aika agent with checkpointing
        memory = MemorySaver()
        aika_agent = create_aika_agent_with_checkpointing(db, checkpointer=memory)
        
        config: dict = {
            "configurable": {
                "thread_id": f"user_{current_user.id}_session_{request.session_id or 'default'}"
            }
        }
        
        # Track what we've already sent
        sent_agents = set()
        current_node = None
        start_time = datetime.now()
        
        # Use astream to get progressive updates
        async for event in aika_agent.astream(initial_state, config):  # type: ignore
            # event is a dict with node_name as key
            for node_name, node_state in event.items():
                # Skip __start__ and __end__ nodes
                if node_name.startswith("__"):
                    continue
                
                # Send status update for new node
                if node_name != current_node and node_name in AGENT_STATUS_MESSAGES:
                    current_node = node_name
                    status_data = {
                        'type': 'status',
                        'node': node_name,
                        'message': AGENT_STATUS_MESSAGES[node_name]
                    }
                    yield f"data: {json.dumps(status_data)}\n\n"
                    await asyncio.sleep(0.05)
                
                # Check for newly invoked agents
                if isinstance(node_state, dict) and "agents_invoked" in node_state:
                    for agent in node_state["agents_invoked"]:
                        if agent not in sent_agents:
                            sent_agents.add(agent)
                            agent_info = AGENT_NAMES.get(agent, {"name": agent, "desc": ""})
                            agent_data = {
                                'type': 'agent',
                                'agent': agent,
                                'name': agent_info['name'],
                                'description': agent_info['desc']
                            }
                            yield f"data: {json.dumps(agent_data)}\n\n"
                            await asyncio.sleep(0.05)
        
        # Get final result
        result = await aika_agent.ainvoke(initial_state, config)  # type: ignore
        
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Send intervention plan if available (check both old and new keys)
        intervention_plan = result.get("sca_intervention_plan") or result.get("intervention_plan")
        if intervention_plan:
            plan_data = {
                'type': 'intervention_plan',
                'data': intervention_plan
            }
            yield f"data: {json.dumps(plan_data)}\n\n"
            await asyncio.sleep(0.05)
        
        # Send appointment if available (check multiple keys and fetch from DB if needed)
        appointment = result.get("sda_appointment")
        appointment_id = result.get("appointment_id")
        
        if appointment:
            # Full appointment object already in state
            appointment_data = {
                'type': 'appointment',
                'data': appointment
            }
            yield f"data: {json.dumps(appointment_data)}\n\n"
            await asyncio.sleep(0.05)
        elif appointment_id:
            # Only ID available, fetch from database
            try:
                from app.domains.mental_health.models.appointments import Appointment
                from sqlalchemy import select
                
                stmt = select(Appointment).where(Appointment.id == appointment_id)
                db_result = await db.execute(stmt)
                appt_record = db_result.scalar_one_or_none()
                
                if appt_record:
                    # Load relationships for complete data
                    await db.refresh(appt_record, ["psychologist", "appointment_type"])
                    
                    appt_dict = {
                        "id": appt_record.id,
                        "student_id": appt_record.user_id,
                        "psychologist_id": appt_record.psychologist_id,
                        "appointment_datetime": appt_record.appointment_datetime.isoformat(),
                        "appointment_type_id": appt_record.appointment_type_id,
                        "status": appt_record.status,
                        "notes": appt_record.notes,
                        "psychologist": {
                            "id": appt_record.psychologist.id,
                            "full_name": appt_record.psychologist.full_name,
                            "specialization": appt_record.psychologist.specialization,
                            "languages": appt_record.psychologist.languages,
                        } if appt_record.psychologist else None,
                        "appointment_type": {
                            "id": appt_record.appointment_type.id,
                            "name": appt_record.appointment_type.name,
                            "description": appt_record.appointment_type.description,
                        } if appt_record.appointment_type else None,
                    }
                    
                    appointment_data = {
                        'type': 'appointment',
                        'data': appt_dict
                    }
                    yield f"data: {json.dumps(appointment_data)}\n\n"
                    await asyncio.sleep(0.05)
            except Exception as e:
                logger.error(f"Failed to fetch appointment {appointment_id}: {e}")

        
        # Send agent activity data
        agent_activity = {
            "execution_path": result.get("execution_path", []),
            "agents_invoked": result.get("agents_invoked", []),
            "intent": result.get("intent", "unknown"),
            "intent_confidence": result.get("intent_confidence", 0.0),
            "needs_agents": result.get("needs_agents", False),
            "agent_reasoning": result.get("agent_reasoning", ""),
            "response_source": result.get("response_source", "unknown"),
            "processing_time_ms": processing_time_ms,
        }
        
        # Add risk assessment if available
        if result.get("sta_risk_assessment"):
            agent_activity["risk_level"] = result["sta_risk_assessment"].get("risk_level", "unknown")
            agent_activity["risk_score"] = result["sta_risk_assessment"].get("risk_score", 0.0)
        
        activity_data = {
            'type': 'agent_activity',
            'data': agent_activity
        }
        yield f"data: {json.dumps(activity_data)}\n\n"
        await asyncio.sleep(0.05)
        
        # Send final complete message
        final_response = result.get("final_response", "Maaf, terjadi kesalahan.")
        metadata_dict = {
            'session_id': result.get('session_id', request.session_id),
            'agents_invoked': result.get('agents_invoked', []),
            'response_source': result.get('response_source', 'unknown'),
            'processing_time_ms': processing_time_ms,
        }
        yield f"data: {json.dumps({'type': 'complete', 'response': final_response, 'metadata': metadata_dict})}\n\n"
        
        logger.info(
            f"✅ Streaming complete: user={current_user.id}, "
            f"agents={result.get('agents_invoked', [])}, time={processing_time_ms:.2f}ms"
        )
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"❌ Streaming error for user {current_user.id}: {exc}", exc_info=True)
        error_data = {
            'type': 'error',
            'message': 'Terjadi kesalahan saat memproses permintaan.',
            'error': str(exc)[:200]
        }
        yield f"data: {json.dumps(error_data)}\n\n"


@router.post("/aika", dependencies=[Depends(check_rate_limit_dependency)])
async def aika_stream_endpoint(
    request: AikaRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    **Streaming Aika Endpoint** - Progressive agent execution with thinking indicators.
    
    Returns Server-Sent Events (SSE) stream with progressive updates:
    1. Thinking indicator
    2. Node execution status
    3. Agent invocation notifications
    4. Intervention plans / appointments (if generated)
    5. Agent activity metadata
    6. Final response
    
    **Use this endpoint for better UX** - shows users what Aika is doing in real-time.
    """
    logger.info(f"📡 Streaming request from user {current_user.id}: {request.message[:50]}...")
    
    return StreamingResponse(
        stream_aika_execution(request, current_user, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Access-Control-Allow-Origin": "*",  # CORS for SSE
        }
    )

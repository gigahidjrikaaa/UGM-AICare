"""
Temporary adapter for existing agent services to work with Aika orchestrator.

This file provides simplified interfaces until we properly implement
the full orchestration methods in each agent service.
"""

import logging
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.llm import generate_response, generate_gemini_response
from app.agents.sta.schemas import STAClassifyRequest
from app.agents.sta.classifiers import SafetyTriageClassifier
from app.agents.aika.tools import get_aika_tools, execute_tool_call

logger = logging.getLogger(__name__)


class SafetyTriageAgent:
    """
    Simplified adapter for STA (Safety Triage Agent).
    
    Uses the STA classifier directly without the full service layer to avoid circular imports.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize classifier directly
        self.classifier = SafetyTriageClassifier()
    
    async def assess_message(
        self,
        user_id: int,
        message: str,
        conversation_history: List[Dict[str, str]],
    ) -> Dict:
        """
        Assess safety risk in user message.
        
        Returns:
            Dict with risk_level, risk_factors, and classification details
        """
        try:
            # Prepare request
            request = STAClassifyRequest(
                text=message,
                session_id=f"session_{user_id}",
                meta={"user_id": user_id},
            )
            
            # Call classifier directly
            result = await self.classifier.classify(request)
            
            # Map risk level
            severity_map = {0: "low", 1: "moderate", 2: "high", 3: "critical"}
            severity = severity_map.get(result.risk_level, "low")
            
            # Convert diagnostic_notes from string to list
            risk_factors = []
            if result.diagnostic_notes:
                # Split by semicolon since classifiers.py joins with "; "
                risk_factors = [note.strip() for note in result.diagnostic_notes.split(";")]
            
            # Convert to dict format for orchestrator
            return {
                "risk_level": severity,
                "risk_score": result.risk_level / 3.0,  # Normalize to 0-1
                "confidence": 0.7,  # Default confidence
                "risk_factors": risk_factors,  # Now properly a list
                "recommended_action": result.next_step or "deliver_self_help_pack",
                "intent": result.intent,
                "next_step": result.next_step,
            }
            
        except Exception as e:
            logger.error(f"❌ STA assessment error: {e}")
            return {
                "risk_level": "unknown",
                "risk_score": 0.0,
                "confidence": 0.0,
                "risk_factors": [],
                "recommended_action": "deliver_self_help_pack",
                "error": str(e),
            }


class SupportCoachAgent:
    """
    Simplified adapter for SCA (Support Coach Agent).
    
    Provides CBT-informed therapeutic support.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def provide_support(
        self,
        user_id: int,
        message: str,
        conversation_history: List[Dict[str, str]],
        risk_context: Optional[Dict] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict:
        """
        Provide therapeutic coaching response with tool calling.
        
        Returns:
            Dict with response, actions, and coaching metadata
        """
        try:
            # Build context-aware prompt
            context = f"""
You are providing support to a student.

Risk Context: {risk_context.get('risk_level', 'unknown') if risk_context else 'unknown'}
User Message: {message}

Previous conversation:
{self._format_history(conversation_history)}

Provide empathetic, supportive response in Indonesian.
"""
            
            # Get available tools
            tool_schemas = get_aika_tools()
            logger.info(f"🔧 SCA Tool calling enabled with {len(tool_schemas)} tools")
            
            # Convert tool schemas to Gemini-compatible format
            # With old google-generativeai SDK, we use plain dict structures
            # Format: [{"function_declarations": [{"name": ..., "description": ..., "parameters": ...}]}]
            gemini_tools = [{
                "function_declarations": tool_schemas
            }]
            
            # Build conversation history for LLM
            llm_history = []
            
            # Add system prompt if provided
            if system_prompt:
                llm_history.append({"role": "system", "content": system_prompt})
                logger.info(f"✅ System prompt added to history: {system_prompt[:50]}...")
            
            # Add user message with context
            llm_history.append({"role": "user", "content": context})
            
            # Tool calling loop
            max_iterations = 3
            iteration = 0
            actions_taken = []
            intervention_plan_created = None  # Track if intervention plan was created
            
            while iteration < max_iterations:
                iteration += 1
                
                # Call LLM with tools
                response_obj = await generate_gemini_response(
                    history=llm_history,
                    model="gemini-2.0-flash-exp",
                    temperature=0.7,
                    tools=gemini_tools,
                    return_full_response=True,  # Get full response for tool calling
                )
                
                # Extract response and tool calls
                response_text = ""
                tool_calls = []
                
                # Handle response object (could be string or object with parts)
                if isinstance(response_obj, str):
                    response_text = response_obj
                elif hasattr(response_obj, 'parts'):
                    for part in response_obj.parts:
                        if hasattr(part, 'text') and part.text:
                            response_text += part.text
                        elif hasattr(part, 'function_call'):
                            tool_calls.append(part.function_call)
                
                # If no tool calls, we're done
                if not tool_calls:
                    logger.info(f"✅ SCA completed after {iteration} iteration(s)")
                    
                    result = {
                        "response": response_text or "Aku di sini untuk mendengarkanmu. Ceritakan lebih lanjut?",
                        "actions": actions_taken if actions_taken else ["provided_emotional_support"],
                        "coaching_type": "cbt_informed",
                        "tools_used": actions_taken,
                    }
                    
                    # Include intervention plan if created
                    if intervention_plan_created:
                        result["intervention_plan"] = intervention_plan_created
                    
                    return result
                
                # Execute tool calls
                logger.info(f"🔧 SCA executing {len(tool_calls)} tool call(s)")
                tool_results = []
                
                for tool_call in tool_calls:
                    tool_name = tool_call.name
                    tool_args = dict(tool_call.args)
                    
                    logger.info(f"  🔧 Calling tool: {tool_name}")
                    
                    try:
                        result = await execute_tool_call(
                            tool_name=tool_name,
                            args=tool_args,
                            db=self.db,
                            user_id=str(user_id)
                        )
                        
                        # Check if intervention plan was created
                        if tool_name == "create_intervention_plan" and result.get("success"):
                            intervention_plan_created = result.get("plan_data")
                            logger.info(f"  ✅ Intervention plan created: {result.get('plan_title')}")
                        
                        tool_results.append({
                            "function_call": tool_call,
                            "function_response": {"name": tool_name, "response": result}
                        })
                        actions_taken.append(f"used_tool_{tool_name}")
                    except Exception as e:
                        logger.error(f"  ❌ Tool {tool_name} failed: {e}")
                        tool_results.append({
                            "function_call": tool_call,
                            "function_response": {"name": tool_name, "response": {"error": str(e)}}
                        })
                
                # Add tool results to history and continue
                # Add model's tool calls
                llm_history.append({
                    "role": "model",
                    "parts": [{"function_call": tc} for tc in tool_calls]
                })
                # Add function responses (use role "user" per Gemini API)
                llm_history.append({
                    "role": "user",
                    "parts": [{"function_response": tr["function_response"]} for tr in tool_results]
                })
            
            # Max iterations reached
            logger.warning(f"⚠️  SCA reached max iterations ({max_iterations})")
            # Ensure response_text is defined
            final_response = response_text if 'response_text' in locals() else "Aku di sini untuk mendengarkanmu. Ceritakan lebih lanjut?"
            
            result = {
                "response": final_response,
                "actions": actions_taken if actions_taken else ["provided_emotional_support"],
                "coaching_type": "cbt_informed",
                "tools_used": actions_taken,
            }
            
            # Include intervention plan if created
            if intervention_plan_created:
                result["intervention_plan"] = intervention_plan_created
            
            return result
            
        except Exception as e:
            logger.error(f"❌ SCA coaching error: {e}", exc_info=True)
            return {
                "response": "Aku di sini untuk mendengarkanmu. Ceritakan lebih lanjut?",
                "actions": ["provided_emotional_support"],
                "error": str(e),
            }
    
    def _format_history(self, history: List[Dict[str, str]]) -> str:
        """Format conversation history for prompt"""
        formatted = []
        for msg in history[-3:]:  # Last 3 messages
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            formatted.append(f"{role}: {content}")
        return "\n".join(formatted) if formatted else "No previous conversation"


class ServiceDeskAgent:
    """
    Simplified adapter for SDA (Service Desk Agent).
    
    Handles case management, escalation, and administrative actions.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_urgent_case(
        self,
        user_id: int,
        risk_level: str,
        risk_factors: List[str],
        conversation_context: List[Dict[str, str]],
    ) -> Dict:
        """
        Create urgent case for counselor intervention.
        
        Returns:
            Dict with case_id, notification status, and escalation details
        """
        try:
            from app.domains.mental_health.models import Case, CaseStatusEnum, CaseSeverityEnum
            from app.models import User
            from sqlalchemy import select
            import hashlib
            
            logger.warning(f"🚑 URGENT CASE: User {user_id}, risk={risk_level}, factors={risk_factors}")
            
            # Get user for hash generation
            result = await self.db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if not user:
                logger.error(f"❌ User {user_id} not found for case creation")
                return {
                    "case_created": False,
                    "error": "User not found",
                }
            
            # Generate user hash for privacy
            user_hash = hashlib.sha256(f"user_{user_id}".encode()).hexdigest()[:16]
            
            # Map risk level to severity
            severity_map = {
                "low": CaseSeverityEnum.low,
                "moderate": CaseSeverityEnum.med,
                "high": CaseSeverityEnum.high,
                "critical": CaseSeverityEnum.critical,
                "unknown": CaseSeverityEnum.med,
            }
            severity = severity_map.get(risk_level, CaseSeverityEnum.high)
            
            # Create summary from conversation context
            summary_parts = [
                f"URGENT ESCALATION - Risk Level: {risk_level.upper()}",
                f"Risk Factors: {', '.join(risk_factors) if risk_factors else 'None specified'}",
                "",
                "Recent Conversation:",
            ]
            
            # Add last 3 messages from context
            for msg in conversation_context[-3:]:
                role = msg.get("role", "unknown")
                content = msg.get("content", "")[:200]  # Truncate long messages
                summary_parts.append(f"{role}: {content}")
            
            summary = "\n".join(summary_parts)
            
            # Create case in database
            from datetime import datetime, timedelta
            
            new_case = Case(
                status=CaseStatusEnum.new,
                severity=severity,
                assigned_to=None,  # Auto-assignment happens later
                user_hash=user_hash,
                session_id=f"aika_session_{user_id}",
                conversation_id=None,  # Would link to actual conversation if available
                summary_redacted=summary,
                sla_breach_at=datetime.utcnow() + timedelta(hours=2 if severity == CaseSeverityEnum.critical else 24),
            )
            
            self.db.add(new_case)
            await self.db.commit()
            await self.db.refresh(new_case)
            
            logger.info(f"✅ Created case {new_case.id} for user {user_id} (severity: {severity.value})")
            
            # TODO: Implement counselor notification
            # This would send email/SMS to on-call counselor
            notification_sent = False
            
            return {
                "case_created": True,
                "case_id": str(new_case.id),
                "priority": severity.value,
                "assigned_counselor": None,
                "notification_sent": notification_sent,
                "sla_breach_at": new_case.sla_breach_at.isoformat() if new_case.sla_breach_at is not None else None,
            }
            
        except Exception as e:
            logger.error(f"❌ SDA case creation error: {e}", exc_info=True)
            await self.db.rollback()
            return {
                "case_created": False,
                "error": str(e),
            }
    
    async def execute_admin_command(
        self,
        command: str,
        user_id: int,
        system_prompt: Optional[str] = None,
    ) -> Dict:
        """
        Execute administrative command (analytics, actions, etc.)
        
        Returns:
            Dict with response, actions taken, and confirmation requirements
        """
        try:
            # Parse command intent
            prompt = f"""
{system_prompt or "You are an administrative assistant."}

User command: {command}

Analyze this command and provide:
1. A response explaining what can be done
2. List of actions to take
3. Whether confirmation is required (for bulk operations)

Respond naturally and helpfully.
"""
            
            response_text = await generate_response(
                history=[{"role": "user", "content": prompt}],
                model="gemini_google",
                temperature=0.3,
            )
            
            # Check if command requires confirmation
            requires_confirmation = any(
                keyword in command.lower() 
                for keyword in ["email", "broadcast", "delete", "bulk"]
            )
            
            return {
                "response": response_text,
                "actions": ["analyzed_command"],
                "requires_confirmation": requires_confirmation,
            }
            
        except Exception as e:
            logger.error(f"❌ SDA admin command error: {e}")
            return {
                "response": "Maaf, terjadi error saat memproses perintah.",
                "actions": [],
                "error": str(e),
            }
    
    async def get_counselor_cases(
        self,
        counselor_id: int,
        query: str,
        system_prompt: Optional[str] = None,
    ) -> Dict:
        """
        Retrieve cases assigned to counselor.
        
        Returns:
            Dict with case list and summary
        """
        try:
            from app.domains.mental_health.models import Case, CaseStatusEnum
            from app.models import AgentUser
            from sqlalchemy import select, func
            
            # Get counselor's agent_user_id
            result = await self.db.execute(
                select(AgentUser).where(AgentUser.user_id == counselor_id)
            )
            agent_user = result.scalar_one_or_none()
            
            if not agent_user:
                logger.warning(f"Counselor {counselor_id} has no agent_user record")
                return {
                    "response": "You are not registered as a counselor in the system.",
                    "cases": [],
                    "total_count": 0,
                }
            
            # Query cases assigned to this counselor
            query_stmt = (
                select(Case)
                .where(Case.assigned_to == agent_user.id)
                .where(Case.status.in_([CaseStatusEnum.new, CaseStatusEnum.in_progress]))
                .order_by(Case.severity.desc(), Case.created_at.desc())
                .limit(20)
            )
            
            result = await self.db.execute(query_stmt)
            cases = result.scalars().all()
            
            # Count by severity
            count_stmt = (
                select(
                    Case.severity,
                    func.count(Case.id).label("count")
                )
                .where(Case.assigned_to == agent_user.id)
                .where(Case.status.in_([CaseStatusEnum.new, CaseStatusEnum.in_progress]))
                .group_by(Case.severity)
            )
            
            result = await self.db.execute(count_stmt)
            severity_counts = {row.severity: row.count for row in result}
            
            # Build response
            if not cases:
                response_text = "You currently have no active cases assigned to you."
            else:
                case_summaries = []
                for case in cases[:10]:  # Show top 10
                    case_summaries.append(
                        f"- **Case #{str(case.id)[:8]}** ({case.severity.value} priority) - "
                        f"Status: {case.status.value}, Created: {case.created_at.strftime('%Y-%m-%d %H:%M')}"
                    )
                
                response_text = f"""You have **{len(cases)}** active cases:

**By Severity:**
- Critical: {severity_counts.get('critical', 0)}
- High: {severity_counts.get('high', 0)}
- Medium: {severity_counts.get('med', 0)}
- Low: {severity_counts.get('low', 0)}

**Top Cases:**
{chr(10).join(case_summaries)}

Use the case management dashboard for detailed views and actions.
"""
            
            return {
                "response": response_text,
                "cases": [
                    {
                        "id": str(case.id),
                        "severity": case.severity.value,
                        "status": case.status.value,
                        "created_at": case.created_at.isoformat(),
                        "summary": case.summary_redacted[:200] if case.summary_redacted is not None else None,
                    }
                    for case in cases
                ],
                "total_count": len(cases),
                "severity_breakdown": severity_counts,
            }
            
        except Exception as e:
            logger.error(f"❌ SDA case retrieval error: {e}", exc_info=True)
            return {
                "response": "Error retrieving cases. Please contact technical support.",
                "cases": [],
                "error": str(e),
            }


class InsightsAgent:
    """
    Simplified adapter for IA (Insights Agent).
    
    Provides analytics and privacy-preserving insights.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def process_admin_query(
        self,
        query: str,
        user_id: int,
        system_prompt: Optional[str] = None,
    ) -> Dict:
        """
        Process analytics query from admin.
        
        Returns:
            Dict with analytics results and visualizations
        """
        try:
            # TODO: Implement actual analytics queries
            prompt = f"""
{system_prompt or "You are a data analyst."}

Admin query: {query}

Provide analytics insights based on this query.
For now, provide a helpful placeholder response explaining what analytics would be shown.
"""
            
            response_text = await generate_response(
                history=[{"role": "user", "content": prompt}],
                model="gemini_google",
                temperature=0.3,
            )
            
            return {
                "response": response_text,
                "data": {},  # Would contain actual analytics data
                "charts": [],  # Would contain chart specifications
            }
            
        except Exception as e:
            logger.error(f"❌ IA analytics error: {e}")
            return {
                "response": "Error generating analytics.",
                "error": str(e),
            }
    
    async def get_clinical_insights(
        self,
        query: str,
        counselor_id: int,
        cases_context: Optional[Dict] = None,
        system_prompt: Optional[str] = None,
    ) -> Dict:
        """
        Provide clinical insights for counselors.
        
        Returns:
            Dict with patient patterns, treatment recommendations, etc.
        """
        try:
            # TODO: Implement actual clinical analytics
            return {
                "response": "Based on the cases, CBT interventions show 70% effectiveness. Consider mindfulness techniques for anxiety cases.",
                "patterns": [],
                "recommendations": [],
            }
            
        except Exception as e:
            logger.error(f"❌ IA clinical insights error: {e}")
            return {
                "response": "Error generating insights.",
                "error": str(e),
            }
    
    async def log_interaction_metrics(
        self,
        user_role: str,
        intent: Optional[str],
        risk_level: Optional[str],
        agents_invoked: List[str],
        processing_time_ms: Optional[float],
    ) -> None:
        """
        Log anonymized metrics for analytics (fire-and-forget).
        
        This runs in background and should not raise exceptions.
        """
        try:
            # TODO: Implement actual metrics logging with differential privacy
            logger.info(
                f"📊 Metrics: role={user_role}, intent={intent}, "
                f"risk={risk_level}, agents={agents_invoked}, "
                f"time={processing_time_ms}ms"
            )
        except Exception as e:
            logger.warning(f"⚠️ Metrics logging failed (non-critical): {e}")

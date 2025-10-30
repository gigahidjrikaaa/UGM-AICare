"""
Aika Meta-Agent Orchestrator

This is the core orchestration logic that routes user requests to the appropriate
specialized agents based on user role and intent.

Architecture:
- Students: STA (triage) → SCA (coaching) → [SDA if escalation] → IA (background analytics)
- Admins: Intent classification → IA (analytics) or SDA (actions) → Response
- Counselors: SDA (case management) → IA (insights) → SCA (recommendations)

All routing is handled by LangGraph with role-aware conditional edges.
"""

import logging
from typing import Dict, List, Literal, Optional
from datetime import datetime
import time

from sqlalchemy.ext.asyncio import AsyncSession
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import AikaState
from .identity import AIKA_SYSTEM_PROMPTS, AIKA_GREETINGS
from .agent_adapters import (  # ✨ Use simplified adapters
    SafetyTriageAgent,
    SupportCoachAgent,
    ServiceDeskAgent,
    InsightsAgent,
)
from app.core.llm import generate_response
from app.models.user import User

logger = logging.getLogger(__name__)


class AikaOrchestrator:
    """
    Meta-agent orchestrator for UGM-AICare.
    
    Aika coordinates all four specialized agents (STA, SCA, SDA, IA) based on
    user role and intent, providing a unified AI personality across the platform.
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize Aika with database session"""
        self.db = db
        
        # Initialize specialized agents
        self.sta = SafetyTriageAgent(db)
        self.sca = SupportCoachAgent(db)
        self.sda = ServiceDeskAgent(db)
        self.ia = InsightsAgent(db)
        
        # Build orchestration graph
        self.graph = self._build_graph()
        
        logger.info("✅ Aika Meta-Agent initialized with 4 specialized agents")
    
    def _build_graph(self) -> StateGraph:
        """
        Build LangGraph orchestration workflow.
        
        Flow:
        1. classify_intent → determine user intent and role
        2. route_by_role → student/admin/counselor path
        3. Specialized agent processing
        4. synthesize_response → unified Aika response
        """
        workflow = StateGraph(AikaState)
        
        # Define nodes
        workflow.add_node("classify_intent", self._classify_intent)
        workflow.add_node("student_triage", self._student_triage)
        workflow.add_node("student_coaching", self._student_coaching)
        workflow.add_node("student_escalation", self._student_escalation)
        workflow.add_node("admin_analytics", self._admin_analytics)
        workflow.add_node("admin_actions", self._admin_actions)
        workflow.add_node("counselor_cases", self._counselor_cases)
        workflow.add_node("counselor_insights", self._counselor_insights)
        workflow.add_node("synthesize_response", self._synthesize_response)
        workflow.add_node("background_analytics", self._background_analytics)
        
        # Entry point
        workflow.set_entry_point("classify_intent")
        
        # Role-based routing
        workflow.add_conditional_edges(
            "classify_intent",
            self._route_by_role,
            {
                "student_triage": "student_triage",
                "admin_analytics": "admin_analytics",
                "admin_actions": "admin_actions",
                "counselor_cases": "counselor_cases",
            }
        )
        
        # Student path
        workflow.add_conditional_edges(
            "student_triage",
            self._check_crisis,
            {
                "crisis": "student_escalation",
                "no_crisis": "student_coaching",
            }
        )
        workflow.add_edge("student_coaching", "synthesize_response")
        workflow.add_edge("student_escalation", "synthesize_response")
        
        # Admin path
        workflow.add_edge("admin_analytics", "synthesize_response")
        workflow.add_edge("admin_actions", "synthesize_response")
        
        # Counselor path
        workflow.add_edge("counselor_cases", "counselor_insights")
        workflow.add_edge("counselor_insights", "synthesize_response")
        
        # Background analytics (runs after response)
        workflow.add_edge("synthesize_response", "background_analytics")
        workflow.add_edge("background_analytics", END)
        
        # Compile graph
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)
    
    # ===================== NODE IMPLEMENTATIONS =====================
    
    async def _classify_intent(self, state: AikaState) -> AikaState:
        """
        Classify user intent and prepare context.
        
        This node determines:
        - What the user wants to do
        - Which agents should be invoked
        - What context is needed
        """
        start_time = time.time()
        
        try:
            # Get user context from database
            user_context = await self._get_user_context(state.user_id)
            state.personal_context = user_context
            
            # Classify intent using LLM
            intent_prompt = f"""
You are Aika's intent classifier. Analyze this message and determine user intent.

User role: {state.user_role}
Message: {state.message}

For STUDENTS, intents:
- "crisis" - self-harm, suicide, severe distress
- "emotional_support" - need to talk, feeling down
- "journaling" - want to reflect or track mood
- "information" - asking about mental health resources

For ADMINS, intents:
- "analytics_query" - asking for data/insights
- "action_request" - wants to perform admin action
- "monitoring" - checking platform health

For COUNSELORS, intents:
- "case_management" - reviewing assigned cases
- "patient_insights" - asking about specific patient
- "clinical_recommendation" - seeking treatment suggestions

Return JSON: {{"intent": "...", "confidence": 0.0-1.0, "reasoning": "..."}}
"""
            
            intent_response = await generate_response(
                history=[{"role": "user", "content": intent_prompt}],
                model="gemini_google",
                temperature=0.3,
            )
            
            # Parse intent (simplified - in production, use JSON parsing)
            import json
            try:
                intent_data = json.loads(intent_response)
                state.intent = intent_data.get("intent", "unknown")
                state.intent_confidence = intent_data.get("confidence", 0.5)
            except:
                # Fallback
                state.intent = "emotional_support" if state.user_role == "user" else "analytics_query"
                state.intent_confidence = 0.5
            
            state.agents_invoked.append("intent_classifier")
            
            logger.info(f"📋 Intent classified: {state.intent} (confidence: {state.intent_confidence})")
            
        except Exception as e:
            logger.error(f"❌ Intent classification error: {e}")
            state.errors.append(f"Intent classification failed: {str(e)}")
            state.intent = "fallback"
        
        state.processing_time_ms = (time.time() - start_time) * 1000
        return state
    
    def _route_by_role(self, state: AikaState) -> str:
        """
        Route to appropriate agent based on user role and intent.
        
        Returns next node name.
        """
        role = state.user_role
        intent = state.intent
        
        # Student routing
        if role == "user":
            return "student_triage"
        
        # Admin routing
        elif role == "admin":
            if "analytics" in intent or "query" in intent:
                return "admin_analytics"
            else:
                return "admin_actions"
        
        # Counselor routing
        elif role == "counselor":
            return "counselor_cases"
        
        # Fallback
        return "student_triage"
    
    async def _student_triage(self, state: AikaState) -> AikaState:
        """
        Safety Triage Agent - assess risk level.
        
        STA checks for crisis indicators and classifies risk.
        """
        try:
            logger.info("🚨 Invoking Safety Triage Agent...")
            
            # Call STA
            triage_result = await self.sta.assess_message(
                user_id=state.user_id,
                message=state.message,
                conversation_history=state.conversation_history,
            )
            
            state.triage_result = triage_result
            state.risk_level = triage_result.get("risk_level", "low")
            state.risk_factors = triage_result.get("risk_factors", [])
            state.agents_invoked.append("STA")
            
            logger.info(f"🚨 STA assessment: Risk level = {state.risk_level}")
            
        except Exception as e:
            logger.error(f"❌ STA error: {e}")
            state.errors.append(f"Safety triage failed: {str(e)}")
            state.risk_level = "unknown"
        
        return state
    
    def _check_crisis(self, state: AikaState) -> str:
        """Check if escalation is needed based on risk level"""
        if state.risk_level in ["high", "critical"]:
            return "crisis"
        return "no_crisis"
    
    async def _student_coaching(self, state: AikaState) -> AikaState:
        """
        Support Coach Agent - provide therapeutic support.
        
        SCA provides CBT-informed coaching and emotional support.
        """
        try:
            logger.info("💙 Invoking Support Coach Agent...")
            
            # Call SCA with system prompt
            system_prompt = AIKA_SYSTEM_PROMPTS["student"]
            
            coaching_result = await self.sca.provide_support(
                user_id=state.user_id,
                message=state.message,
                conversation_history=state.conversation_history,
                risk_context=state.triage_result,
                system_prompt=system_prompt,
            )
            
            state.coaching_result = coaching_result
            state.response = coaching_result.get("response")
            state.actions_taken.extend(coaching_result.get("actions", []))
            state.agents_invoked.append("SCA")
            
            logger.info("💙 SCA provided coaching response")
            
        except Exception as e:
            logger.error(f"❌ SCA error: {e}")
            state.errors.append(f"Coaching failed: {str(e)}")
            state.response = AIKA_GREETINGS["student"]
        
        return state
    
    async def _student_escalation(self, state: AikaState) -> AikaState:
        """
        Service Desk Agent - escalate crisis to human counselor.
        
        SDA creates urgent case and notifies counselor.
        """
        try:
            logger.info("🚑 Invoking Service Desk Agent for crisis escalation...")
            
            # Call SDA to create urgent case
            service_result = await self.sda.create_urgent_case(
                user_id=state.user_id,
                risk_level=state.risk_level,
                risk_factors=state.risk_factors,
                conversation_context=state.conversation_history,
            )
            
            state.service_result = service_result
            state.escalation_needed = True
            state.escalation_reason = "High-risk crisis detected"
            state.actions_taken.append("Created urgent case for counselor")
            state.agents_invoked.append("SDA")
            
            # Provide immediate crisis resources
            state.response = await self._generate_crisis_response(state)
            
            logger.info("🚑 SDA escalated to human counselor")
            
        except Exception as e:
            logger.error(f"❌ SDA error: {e}")
            state.errors.append(f"Escalation failed: {str(e)}")
        
        return state
    
    async def _admin_analytics(self, state: AikaState) -> AikaState:
        """
        Insights Agent - provide analytics for admin.
        
        IA retrieves platform metrics, trends, and insights.
        """
        try:
            logger.info("📊 Invoking Insights Agent for admin analytics...")
            
            # Call IA with admin system prompt
            system_prompt = AIKA_SYSTEM_PROMPTS["admin"]
            
            insights_result = await self.ia.process_admin_query(
                query=state.message,
                user_id=state.user_id,
                system_prompt=system_prompt,
            )
            
            state.insights_result = insights_result
            state.admin_query_result = insights_result
            state.response = insights_result.get("response")
            state.agents_invoked.append("IA")
            
            logger.info("📊 IA provided analytics")
            
        except Exception as e:
            logger.error(f"❌ IA error: {e}")
            state.errors.append(f"Analytics failed: {str(e)}")
            state.response = "Maaf, terjadi error saat mengambil analytics."
        
        return state
    
    async def _admin_actions(self, state: AikaState) -> AikaState:
        """
        Service Desk Agent - execute admin actions.
        
        SDA handles admin commands (notifications, reports, etc.)
        """
        try:
            logger.info("⚙️ Invoking Service Desk Agent for admin actions...")
            
            # Call SDA for admin actions
            system_prompt = AIKA_SYSTEM_PROMPTS["admin"]
            
            action_result = await self.sda.execute_admin_command(
                command=state.message,
                user_id=state.user_id,
                system_prompt=system_prompt,
            )
            
            state.service_result = action_result
            state.admin_action_result = action_result
            state.confirmation_required = action_result.get("requires_confirmation", False)
            state.response = action_result.get("response")
            state.actions_taken.extend(action_result.get("actions", []))
            state.agents_invoked.append("SDA")
            
            logger.info("⚙️ SDA executed admin action")
            
        except Exception as e:
            logger.error(f"❌ SDA error: {e}")
            state.errors.append(f"Admin action failed: {str(e)}")
            state.response = "Maaf, terjadi error saat menjalankan perintah."
        
        return state
    
    async def _counselor_cases(self, state: AikaState) -> AikaState:
        """
        Service Desk Agent - provide case management for counselors.
        
        SDA retrieves assigned cases, patient summaries, etc.
        """
        try:
            logger.info("📋 Invoking Service Desk Agent for counselor cases...")
            
            # Call SDA for case management
            system_prompt = AIKA_SYSTEM_PROMPTS["counselor"]
            
            cases_result = await self.sda.get_counselor_cases(
                counselor_id=state.user_id,
                query=state.message,
                system_prompt=system_prompt,
            )
            
            state.service_result = cases_result
            state.counselor_cases_result = cases_result
            state.agents_invoked.append("SDA")
            
            logger.info("📋 SDA provided case management info")
            
        except Exception as e:
            logger.error(f"❌ SDA error: {e}")
            state.errors.append(f"Case management failed: {str(e)}")
        
        return state
    
    async def _counselor_insights(self, state: AikaState) -> AikaState:
        """
        Insights Agent - provide clinical insights for counselors.
        
        IA provides patient patterns, treatment effectiveness, etc.
        """
        try:
            logger.info("💡 Invoking Insights Agent for counselor insights...")
            
            # Call IA for clinical insights
            system_prompt = AIKA_SYSTEM_PROMPTS["counselor"]
            
            insights_result = await self.ia.get_clinical_insights(
                query=state.message,
                counselor_id=state.user_id,
                cases_context=state.counselor_cases_result,
                system_prompt=system_prompt,
            )
            
            state.insights_result = insights_result
            state.counselor_insights_result = insights_result
            state.agents_invoked.append("IA")
            
            # Combine case info and insights
            state.response = self._combine_counselor_response(state)
            
            logger.info("💡 IA provided clinical insights")
            
        except Exception as e:
            logger.error(f"❌ IA error: {e}")
            state.errors.append(f"Clinical insights failed: {str(e)}")
            state.response = state.counselor_cases_result.get("response", "")
        
        return state
    
    async def _synthesize_response(self, state: AikaState) -> AikaState:
        """
        Final synthesis - ensure response maintains Aika's personality.
        
        This node ensures all responses sound like Aika, regardless of
        which specialized agents were invoked.
        """
        try:
            logger.info("✨ Synthesizing final Aika response...")
            
            # If response already generated by specialized agent, just validate tone
            if state.response:
                # Response already exists, just log
                logger.info("✨ Using response from specialized agent")
            else:
                # Generate fallback response
                state.response = self._generate_fallback_response(state)
            
            # Add actions summary if any actions were taken
            if state.actions_taken:
                actions_summary = "\n\n🔧 **Actions taken:**\n" + "\n".join(
                    f"- {action}" for action in state.actions_taken
                )
                state.response += actions_summary
            
            # Add escalation notice if needed
            if state.escalation_needed:
                state.response += "\n\n⚠️ **Case escalated to human counselor for immediate attention.**"
            
        except Exception as e:
            logger.error(f"❌ Response synthesis error: {e}")
            state.response = self._generate_error_response(state)
        
        return state
    
    async def _background_analytics(self, state: AikaState) -> AikaState:
        """
        Background analytics - run after response (non-blocking).
        
        IA collects anonymized metrics for research and platform improvement.
        """
        try:
            logger.info("📈 Running background analytics...")
            
            # Call IA to log anonymized metrics (fire-and-forget)
            await self.ia.log_interaction_metrics(
                user_role=state.user_role,
                intent=state.intent,
                risk_level=state.risk_level,
                agents_invoked=state.agents_invoked,
                processing_time_ms=state.processing_time_ms,
            )
            
            logger.info("📈 Background analytics completed")
            
        except Exception as e:
            logger.error(f"⚠️ Background analytics error (non-critical): {e}")
        
        return state
    
    # ===================== HELPER METHODS =====================
    
    async def _get_user_context(self, user_id: int) -> Dict:
        """Fetch user context from database"""
        try:
            from app.models import User
            from app.domains.mental_health.models import PlayerWellnessState, Conversation
            from sqlalchemy import select, func
            
            # Get user basic info
            result = await self.db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if not user:
                return {"user_id": user_id, "has_history": False}
            
            # Get wellness state
            result = await self.db.execute(
                select(PlayerWellnessState).where(PlayerWellnessState.user_id == user_id)
            )
            wellness = result.scalar_one_or_none()
            
            # Count conversations
            result = await self.db.execute(
                select(func.count(Conversation.id))
                .where(Conversation.user_id == user_id)
            )
            conversation_count = result.scalar() or 0
            
            context = {
                "user_id": user_id,
                "preferred_name": user.preferred_name or user.first_name or user.name,
                "has_history": conversation_count > 0,
                "conversation_count": conversation_count,
            }
            
            if wellness:
                context.update({
                    "harmony_score": wellness.harmony_score,
                    "current_streak": wellness.current_streak,
                    "wellness_level": "good" if wellness.harmony_score >= 70 else "needs_attention",
                })
            
            return context
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to fetch user context: {e}")
            return {
                "user_id": user_id,
                "has_history": False,
            }
    
    async def _generate_crisis_response(self, state: AikaState) -> str:
        """Generate immediate crisis response with resources"""
        return f"""
Aku mengerti kamu sedang mengalami kesulitan yang sangat berat. Keselamatanmu adalah prioritas utama kami.

**🚨 Bantuan Darurat:**
- **Hotline Crisis Center**: 119 (24/7)
- **Hotline Kemenkes RI**: 500-454 (24/7)
- **Sejiwa (Into The Light)**: 119 ext. 8 (24/7)

Aku sudah memberitahu counselor profesional kami. Mereka akan segera menghubungimu.

Jangan ragu untuk mencari bantuan segera jika kamu dalam bahaya. Kamu tidak sendirian, dan ada banyak orang yang peduli padamu. 💙

**Apa yang bisa kamu lakukan sekarang:**
1. Hubungi hotline darurat di atas
2. Beritahu orang terdekat yang kamu percaya
3. Pergi ke UGD rumah sakit terdekat jika dalam bahaya langsung
4. Tunggu counselor kami menghubungimu

Kamu sangat berharga, dan dunia lebih baik dengan kehadiranmu. 🌟
"""
    
    def _combine_counselor_response(self, state: AikaState) -> str:
        """Combine case management and insights for counselors"""
        cases = state.counselor_cases_result.get("response", "")
        insights = state.counselor_insights_result.get("response", "")
        
        return f"{cases}\n\n---\n\n**Clinical Insights:**\n{insights}"
    
    def _generate_fallback_response(self, state: AikaState) -> str:
        """Generate fallback response if specialized agents didn't provide one"""
        role = state.user_role
        return AIKA_GREETINGS.get(role, "Hello! How can I help you today?")
    
    def _generate_error_response(self, state: AikaState) -> str:
        """Generate error response"""
        role = state.user_role
        
        if role == "user":
            return "Maaf, aku sedang mengalami kendala teknis. Tapi aku tetap di sini untukmu. Coba ulangi pesanmu?"
        elif role == "admin":
            return f"Error occurred: {', '.join(state.errors)}"
        else:
            return "I'm experiencing technical difficulties. Please try again."
    
    # ===================== PUBLIC API =====================
    
    async def process_message(
        self,
        user_id: int,
        user_role: Literal["user", "counselor", "admin"],
        message: str,
        session_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict:
        """
        Main entry point - process user message through Aika.
        
        Args:
            user_id: User ID
            user_role: User's role (user=student, counselor, admin)
            message: User's message
            session_id: Optional session ID for continuity
            conversation_history: Optional conversation history
        
        Returns:
            Dict with response and metadata
        """
        start_time = time.time()
        
        # Initialize state
        initial_state = AikaState(
            user_id=user_id,
            user_role=user_role,
            message=message,
            session_id=session_id or f"session_{user_id}_{int(time.time())}",
            conversation_history=conversation_history or [],
        )
        
        try:
            # Run through orchestration graph
            config = {"configurable": {"thread_id": initial_state.session_id}}
            final_state = await self.graph.ainvoke(initial_state, config)
            
            # Calculate total processing time
            total_time_ms = (time.time() - start_time) * 1000
            
            # ✅ FIX: final_state is a dict, not an object - access with dict keys
            agents_invoked = final_state.get("agents_invoked", [])
            
            logger.info(
                f"✅ Aika processed message in {total_time_ms:.2f}ms "
                f"(agents: {', '.join(agents_invoked)})"
            )
            
            # Return response
            return {
                "success": True,
                "response": final_state.get("response", ""),
                "metadata": {
                    "session_id": final_state.get("session_id", ""),
                    "user_role": final_state.get("user_role", ""),
                    "intent": final_state.get("intent", ""),
                    "agents_invoked": agents_invoked,
                    "processing_time_ms": total_time_ms,
                    "risk_level": final_state.get("risk_level", ""),
                    "escalation_needed": final_state.get("escalation_needed", False),
                    "actions_taken": final_state.get("actions_taken", []),
                },
                "errors": final_state.get("errors") if final_state.get("errors") else None,
            }
            
        except Exception as e:
            logger.error(f"❌ Aika orchestration error: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "response": self._generate_error_response(initial_state),
            }

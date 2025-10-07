"""
Agent Integration Service

This module orchestrates interaction between Aika's chat flow and specialized AI agents:
- STA (Safety Triage Agent): Background risk assessment
- SCA (Support Coach Agent): User-facing intervention plans

Design Principles:
- Modular: Each agent integration is independent
- Non-intrusive: Agents work alongside Aika, not replacing it
- Configurable: Easy to enable/disable agent features
- Async-first: All operations are async for performance
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.sca.schemas import (
    SCAInterveneRequest,
    SCAInterveneResponse,
)
from app.agents.sca.service import SupportCoachService
from app.agents.sta.classifiers import SafetyTriageClassifier
from app.agents.sta.schemas import (
    STAClassifyRequest,
    STAClassifyResponse,
)
from app.agents.sta.service import SafetyTriageService
from app.schemas.intervention_plans import (
    InterventionPlanRecordCreate,
    InterventionPlanData,
    PlanStep,
    ResourceCard,
    NextCheckIn
)
from app.services.intervention_plan_service import InterventionPlanService

logger = logging.getLogger(__name__)


@dataclass
class AgentInterventionResult:
    """Result from agent intervention analysis.
    
    Attributes:
        should_intervene: Whether an intervention should be presented to user
        intervention_plan: The SCA-generated plan (if should_intervene is True)
        risk_assessment: The STA classification result
        intervention_reason: Human-readable reason for intervention
    """
    should_intervene: bool
    intervention_plan: Optional[SCAInterveneResponse] = None
    risk_assessment: Optional[STAClassifyResponse] = None
    intervention_reason: Optional[str] = None


class AgentIntegrationService:
    """Orchestrates agent integration with Aika's chat flow.
    
    This service provides a clean interface for:
    1. Analyzing user messages for risk and distress
    2. Generating appropriate interventions
    3. Deciding when to present agent-generated plans to users
    
    Usage:
        service = AgentIntegrationService(db)
        result = await service.analyze_and_intervene(
            user_id=user.id,
            session_id=session_id,
            user_message="I'm so stressed about exams"
        )
        if result.should_intervene:
            # Present intervention_plan to user
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        # Initialize STA service with classifier
        classifier = SafetyTriageClassifier()
        self.sta_service = SafetyTriageService(
            classifier=classifier,
            session=db,
        )
        # Initialize SCA service
        self.sca_service = SupportCoachService()
    
    async def analyze_and_intervene(
        self,
        user_id: int,
        session_id: str,
        user_message: str,
        consent_followup: bool = True,
        enable_sta: bool = True,
        enable_sca: bool = True,
    ) -> AgentInterventionResult:
        """Analyze user message and generate intervention if needed.
        
        Flow:
        1. STA analyzes message for risk level (0-3) and intent
        2. If risk is moderate (1) or high (2), trigger SCA intervention
        3. If risk is critical (3), flag for human escalation (no SCA)
        4. SCA generates personalized action plan based on intent
        
        Args:
            user_id: User's database ID
            session_id: Current conversation session ID
            user_message: The user's latest message
            consent_followup: Whether user consents to follow-up check-ins
            enable_sta: Whether to run safety triage (default: True)
            enable_sca: Whether to generate interventions (default: True)
            
        Returns:
            AgentInterventionResult with intervention plan if applicable
        """
        # Default: no intervention
        result = AgentInterventionResult(should_intervene=False)
        
        # Step 1: Safety Triage Analysis (if enabled)
        if not enable_sta:
            logger.debug("STA disabled, skipping risk assessment for user %s", user_id)
            return result
        
        try:
            sta_request = STAClassifyRequest(
                session_id=session_id,
                text=user_message,
                meta={"user_id": user_id},
            )
            sta_response = await self.sta_service.classify(payload=sta_request)
            result.risk_assessment = sta_response
            
            logger.info(
                "STA Analysis - User: %s, Risk: %s, Intent: %s, NextStep: %s",
                user_id,
                sta_response.risk_level,
                sta_response.intent,
                sta_response.next_step,
            )
        except Exception as sta_error:
            logger.error("STA classification failed for user %s: %s", user_id, sta_error, exc_info=True)
            # Continue without STA - don't block chat flow
            return result
        
        # Step 2: Determine if intervention is needed
        risk_level = sta_response.risk_level
        intent = sta_response.intent
        next_step = sta_response.next_step
        
        # Critical risk (3) -> Human escalation, no SCA intervention
        if risk_level == 3:
            logger.warning(
                "Critical risk detected for user %s, session %s - flagging for human review",
                user_id,
                session_id,
            )
            result.should_intervene = False
            result.intervention_reason = "critical_risk_human_escalation"
            return result
        
        # Low risk (0) -> No intervention needed
        if risk_level == 0:
            logger.debug("Low risk, no intervention needed for user %s", user_id)
            return result
        
        # Moderate (1) or High (2) risk -> SCA intervention if recommended
        if next_step != "sca":
            logger.debug(
                "STA recommends '%s' instead of SCA for user %s",
                next_step,
                user_id,
            )
            return result
        
        # Step 3: Generate SCA intervention (if enabled)
        if not enable_sca:
            logger.debug("SCA disabled, skipping intervention generation for user %s", user_id)
            return result
        
        try:
            # Generate user_hash for event tracking (same logic as STA)
            user_hash = self._generate_user_hash(user_id, session_id)
            
            sca_request = SCAInterveneRequest(
                session_id=session_id,
                intent=intent,
                options={"user_hash": user_hash} if user_hash else {},
                consent_followup=consent_followup,
            )
            sca_response = await self.sca_service.intervene(payload=sca_request)
            
            result.should_intervene = True
            result.intervention_plan = sca_response
            result.intervention_reason = f"risk_level_{risk_level}_{intent}"
            
            # Store the intervention plan in database
            await self._store_intervention_plan(
                user_id=user_id,
                session_id=session_id,
                sca_response=sca_response,
                risk_level=risk_level,
                conversation_id=None  # TODO: Pass conversation_id from chat service if available
            )
            
            logger.info(
                "SCA Intervention Generated - User: %s, Intent: %s, Steps: %s, Resources: %s",
                user_id,
                intent,
                len(sca_response.plan_steps),
                len(sca_response.resource_cards),
            )
        except Exception as sca_error:
            logger.error("SCA intervention failed for user %s: %s", user_id, sca_error, exc_info=True)
            # Continue without intervention - don't block chat flow
            result.should_intervene = False
        
        return result
    
    async def analyze_risk_only(
        self,
        session_id: str,
        user_message: str,
        user_id: Optional[int] = None,
    ) -> Optional[STAClassifyResponse]:
        """Run STA analysis without triggering SCA intervention.
        
        Useful for:
        - Background risk monitoring
        - Analytics and insights
        - Admin dashboards
        
        Args:
            session_id: Current conversation session ID
            user_message: The user's message to analyze
            user_id: Optional user ID for logging
            
        Returns:
            STAClassifyResponse or None if analysis fails
        """
        try:
            sta_request = STAClassifyRequest(
                session_id=session_id,
                text=user_message,
                meta={"user_id": user_id} if user_id else {},
            )
            sta_response = await self.sta_service.classify(payload=sta_request)
            logger.info(
                "Risk-only analysis - Session: %s, Risk: %s, Intent: %s",
                session_id,
                sta_response.risk_level,
                sta_response.intent,
            )
            return sta_response
        except Exception as error:
            logger.error("Risk analysis failed for session %s: %s", session_id, error, exc_info=True)
            return None
    
    @staticmethod
    def _generate_user_hash(user_id: Optional[int], session_id: str) -> Optional[str]:
        """Generate user hash for agent event tracking.
        
        Uses the same logic as STA service to ensure consistency across agents.
        
        Args:
            user_id: User's database ID (preferred)
            session_id: Session ID as fallback
            
        Returns:
            16-character hash or None
        """
        if user_id is not None:
            return hashlib.sha256(f"user:{user_id}".encode("utf-8")).hexdigest()[:16]
        if session_id:
            return hashlib.sha256(f"session:{session_id}".encode("utf-8")).hexdigest()[:16]
        return None
    
    async def _store_intervention_plan(
        self,
        user_id: int,
        session_id: str,
        sca_response: SCAInterveneResponse,
        risk_level: int,
        conversation_id: Optional[int] = None
    ) -> None:
        """Store SCA-generated intervention plan in database.
        
        Args:
            user_id: User's database ID
            session_id: Current session ID
            sca_response: The SCA intervention response
            risk_level: Risk level from STA (0-3)
            conversation_id: Optional conversation ID from chat
        """
        try:
            # Convert SCA response objects to intervention plan schema format
            from app.schemas.intervention_plans import PlanStep as InterventionPlanStep
            from app.schemas.intervention_plans import ResourceCard as InterventionResourceCard
            from app.schemas.intervention_plans import NextCheckIn as InterventionNextCheckIn
            
            # Convert plan steps (SCA uses id/label, we use title/description)
            plan_steps = [
                InterventionPlanStep(
                    title=step.label,  # SCA uses 'label'
                    description=f"{step.label} ({step.duration_min} min)" if step.duration_min else step.label,
                    completed=False
                )
                for step in sca_response.plan_steps
            ]
            
            # Convert resource cards (SCA uses resource_id/summary, we use title/url/description)
            resource_cards = [
                InterventionResourceCard(
                    title=card.title,
                    url=card.url or "",
                    description=card.summary
                )
                for card in sca_response.resource_cards
            ]
            
            # Convert next_check_in (SCA uses datetime, we use timeframe/method)
            if sca_response.next_check_in:
                # Calculate timeframe from datetime
                from datetime import datetime
                time_diff = sca_response.next_check_in - datetime.now()
                hours = int(time_diff.total_seconds() / 3600)
                if hours < 24:
                    timeframe = f"{hours} hours"
                else:
                    days = hours // 24
                    timeframe = f"{days} days"
                
                next_check_in = InterventionNextCheckIn(
                    timeframe=timeframe,
                    method="chat"
                )
            else:
                next_check_in = InterventionNextCheckIn(
                    timeframe="24 hours",
                    method="chat"
                )
            
            plan_data = InterventionPlanData(
                plan_steps=plan_steps,
                resource_cards=resource_cards,
                next_check_in=next_check_in
            )
            
            # Generate plan title from first step or intent
            plan_title = plan_steps[0].title if plan_steps else "Support Plan"
            if len(plan_title) > 100:
                plan_title = plan_title[:97] + "..."
            
            plan_create = InterventionPlanRecordCreate(
                user_id=user_id,
                session_id=session_id,
                conversation_id=conversation_id,
                plan_title=plan_title,
                risk_level=risk_level,
                plan_data=plan_data,
                total_steps=len(plan_steps)
            )
            
            # Store in database using async session
            stored_plan = await InterventionPlanService.create_plan(
                db=self.db,
                plan_data=plan_create
            )
            
            logger.info(
                "Intervention plan stored - ID: %s, User: %s, Steps: %s",
                stored_plan.id,
                user_id,
                len(plan_steps)
            )
            
        except Exception as error:
            logger.error(
                "Failed to store intervention plan for user %s: %s",
                user_id,
                error,
                exc_info=True
            )
            # Don't raise - plan storage failure shouldn't block user flow

import hashlib
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, cast

import pytest  # type: ignore
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
	sys.path.append(str(ROOT))

from app.database import Base  # noqa: E402
from app.agents.ia.schemas import IAQueryParams, IAQueryRequest  # noqa: E402
from app.agents.ia.service import InsightsAgentService  # noqa: E402
from app.agents.sca.schemas import SCAFollowUpRequest, SCAInterveneRequest  # noqa: E402
from app.agents.sca.service import SupportCoachService  # noqa: E402
from app.agents.sda.schemas import SDAAssignRequest, SDACloseRequest  # noqa: E402
from app.agents.sda.service import SafetyDeskService  # noqa: E402
from app.agents.sta.classifiers import SafetyTriageClassifier  # noqa: E402
from app.agents.sta.schemas import STAClassifyRequest  # noqa: E402
from app.agents.sta.service import SafetyTriageService  # noqa: E402
from app.core.events import AgentEvent  # noqa: E402
from app.models import (  # noqa: E402
	Case,
	CaseSeverityEnum,
	CaseStatusEnum,
	InterventionCampaignExecution,
	Conversation,
	InterventionCampaign,
	TriageAssessment,
	User,
)

from sqlalchemy.dialects.sqlite import base as sqlite_base  # noqa: E402


def _sqlite_uuid_compiler(self, type_, **kw):  # pragma: no cover - monkeypatch for tests
	return "CHAR(32)"


sqlite_base.SQLiteTypeCompiler.visit_UUID = _sqlite_uuid_compiler  # type: ignore[attr-defined]


def _enum_str(value: Any) -> str:
	if hasattr(value, "value"):
		return str(getattr(value, "value"))
	text = str(value)
	if "." in text:
		return text.split(".")[-1]
	return text


TABLES = [
	User.__table__,
	Case.__table__,
	TriageAssessment.__table__,
	Conversation.__table__,
	InterventionCampaign.__table__,
	InterventionCampaignExecution.__table__,
]


def _create_tables(connection) -> None:
	Base.metadata.create_all(bind=connection, tables=TABLES)


@pytest.mark.asyncio
async def test_safety_triage_service_creates_assessment_case_and_event() -> None:
	engine = create_async_engine("sqlite+aiosqlite:///:memory:")
	session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

	async with engine.begin() as conn:
		await conn.run_sync(_create_tables)

	try:
		async with session_factory() as session:
			user = User(email="triage@example.com", role="user")
			session.add(user)
			await session.flush()

			events: list[AgentEvent] = []

			async def _capture(event: AgentEvent) -> None:
				events.append(event)

			service = SafetyTriageService(
				classifier=SafetyTriageClassifier(),
				session=session,
				event_emitter=_capture,
			)

			request = STAClassifyRequest(
				session_id="sess-triage-1",
				text="Saya ingin mengakhiri hidup saya malam ini. Hubungi saya di test@example.com",
				meta={"user_id": user.id, "conversation_id": 42},
			)

			result = await service.classify(request)

			assessments = (await session.execute(select(TriageAssessment))).scalars().all()
			assert len(assessments) == 1
			assessment = assessments[0]
			assert assessment.severity_level in {"high", "critical"}
			assert assessment.recommended_action == "escalate_manual_review"
			assert assessment.risk_factors is not None

			cases = (await session.execute(select(Case))).scalars().all()
			assert len(cases) == 1
			case = cases[0]
			assert _enum_str(case.status) == CaseStatusEnum.new.value
			assert _enum_str(case.severity) in {
				CaseSeverityEnum.high.value,
				CaseSeverityEnum.critical.value,
			}
			assert "[REDACTED]" in (case.summary_redacted or "")

			expected_hash = hashlib.sha256(f"user:{user.id}".encode("utf-8")).hexdigest()[:16]
			assert events
			payload = events[0].payload
			assert payload["assessment_id"] == assessment.id
			assert payload["risk_flag"] == result.risk_level
			assert payload["user_hash"] == expected_hash
	finally:
		await engine.dispose()


@pytest.mark.asyncio
async def test_support_coach_service_generates_plan_and_followup() -> None:
	events: list[AgentEvent] = []

	async def _capture(event: AgentEvent) -> None:
		events.append(event)

	service = SupportCoachService(event_emitter=_capture)

	request = SCAInterveneRequest(
		session_id="sess-sca",
		intent="academic_stress",
		options={"check_in_hours": 12, "user_hash": "abc123"},
		consent_followup=True,
	)
	response = await service.intervene(request)

	assert response.plan_steps, "Plan steps should not be empty"
	assert response.resource_cards, "Resource cards should not be empty"
	assert response.next_check_in is not None

	assert events
	event_payload = events[0].payload
	assert event_payload["plan_length"] == len(response.plan_steps)
	assert event_payload["resource_count"] == len(response.resource_cards)

	followup = await service.followup(
		SCAFollowUpRequest(
			session_id="sess-sca",
			last_plan_id="plan-123",
			check_in={"mood": "worse", "stress": "high", "user_hash": "abc123"},
		)
	)

	assert followup.acknowledged is True
	assert followup.next_check_in is not None
	delta = followup.next_check_in - datetime.utcnow()
	assert delta.total_seconds() > 0


@pytest.mark.asyncio
async def test_safety_desk_service_assign_and_close_case() -> None:
	engine = create_async_engine("sqlite+aiosqlite:///:memory:")
	session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

	async with engine.begin() as conn:
		await conn.run_sync(_create_tables)

	try:
		async with session_factory() as session:
			case = Case(
				status=CaseStatusEnum.new,
				severity=CaseSeverityEnum.high,
				assigned_to=None,
				user_hash="hash-1",
				session_id="sess-1",
				summary_redacted="Summary",
			)
			session.add(case)
			await session.commit()
			await session.refresh(case)

			service = SafetyDeskService(session=session)

			assign_response = await service.assign_case(
				SDAAssignRequest(case_id=str(case.id), assignee_id="counselor-1")
			)

			assert assign_response.assigned_to == "counselor-1"

			updated_case = await session.get(Case, case.id)
			assert updated_case is not None
			assigned_to = cast(str | None, updated_case.assigned_to)
			assert assigned_to == "counselor-1"
			assert _enum_str(updated_case.status) == CaseStatusEnum.in_progress.value

			close_response = await service.close_case(
				SDACloseRequest(case_id=str(case.id), closure_reason="Resolved")
			)

			assert close_response.status == CaseStatusEnum.closed

			closed_case = await session.get(Case, case.id)
			assert closed_case is not None
			assert _enum_str(closed_case.status) == CaseStatusEnum.closed.value
			closure_reason = cast(str | None, closed_case.closure_reason)
			assert closure_reason == "Resolved"
	finally:
		await engine.dispose()


@pytest.mark.asyncio
async def test_insights_agent_service_runs_core_queries() -> None:
	engine = create_async_engine("sqlite+aiosqlite:///:memory:")
	session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

	async with engine.begin() as conn:
		await conn.run_sync(_create_tables)

	try:
		async with session_factory() as session:
			user_primary = User(email="insights1@example.com", role="user")
			user_secondary = User(email="insights2@example.com", role="user")
			session.add_all([user_primary, user_secondary])
			await session.flush()

			now = datetime(2025, 5, 20, 12, 0, 0)
			start_window = now - timedelta(days=1)
			end_window = now + timedelta(hours=1)

			assessments = [
				TriageAssessment(
					user_id=user_primary.id,
					conversation_id=None,
					risk_score=0.95,
					confidence_score=0.8,
					severity_level="critical",
					recommended_action="escalate_manual_review",
					assessment_data={"intent": "crisis_support"},
					created_at=now - timedelta(hours=2),
				),
				TriageAssessment(
					user_id=user_secondary.id,
					conversation_id=None,
					risk_score=0.4,
					confidence_score=0.7,
					severity_level="low",
					recommended_action="deliver_self_help_pack",
					assessment_data={"intent": "general_support"},
					created_at=now - timedelta(hours=4),
				),
			]
			session.add_all(assessments)

			campaign = InterventionCampaign(
				campaign_type="support",
				title="Support Outreach",
				description="",
				content={"steps": []},
			)
		session.add(campaign)
		await session.flush()

		executions = [
			InterventionCampaignExecution(
				campaign_id=campaign.id,
				user_id=user_primary.id,
				status="completed",
				engagement_score=0.85,
				created_at=now - timedelta(hours=3),
			),
			InterventionCampaignExecution(
				campaign_id=campaign.id,
				user_id=user_secondary.id,
				status="sent",
				engagement_score=0.5,
					created_at=now - timedelta(hours=5),
				),
			]
			session.add_all(executions)

			conversations = [
				Conversation(
					user_id=user_primary.id,
					session_id="sess-short",
					conversation_id="conv-short",
					message="Hi",
					response="Hello",
					timestamp=now - timedelta(hours=1, minutes=30),
				),
				Conversation(
					user_id=user_primary.id,
					session_id="sess-long",
					conversation_id="conv-long",
					message="Need help",
					response="Sure",
					timestamp=now - timedelta(hours=1),
				),
				Conversation(
					user_id=user_primary.id,
					session_id="sess-long",
					conversation_id="conv-long",
					message="Still here",
					response="Yes",
					timestamp=now - timedelta(minutes=50),
				),
			]
			session.add_all(conversations)

			await session.commit()

			service = InsightsAgentService(session=session)
			params = IAQueryParams(**{"from": start_window, "to": end_window})

			crisis = await service.query(IAQueryRequest(question_id="crisis_trend", params=params))
			assert crisis.chart["series"], "Crisis trend should provide chart data"
			assert crisis.table, "Crisis trend should provide table rows"

			dropoffs = await service.query(IAQueryRequest(question_id="dropoffs", params=params))
			assert dropoffs.table, "Dropoffs should provide metrics"
			assert dropoffs.chart["series"][0]["data"], "Dropoffs chart should have data"

			reuse = await service.query(IAQueryRequest(question_id="resource_reuse", params=params))
			assert reuse.table, "Resource reuse should return rows"
			assert reuse.chart["series"][0]["data"], "Resource reuse chart should have data"

			fallback = await service.query(IAQueryRequest(question_id="fallback_reduction", params=params))
			assert fallback.table, "Fallback reduction should provide metrics"

			cost = await service.query(IAQueryRequest(question_id="cost_per_helpful", params=params))
			assert cost.chart["type"] == "gauge"
	finally:
		await engine.dispose()
import os
import sys

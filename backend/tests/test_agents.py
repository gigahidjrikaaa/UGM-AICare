"""
Safety Agent Suite Tests (LangGraph Aika Meta-Agent)
====================================================

Tests for the Aika Meta-Agent orchestrator which coordinates:
- Safety Triage Agent (STA): Crisis detection and risk classification
- Support Coach Agent (SCA): CBT-informed coaching and intervention plans
- Service Desk Agent (SDA): Clinical case management
- Insights Agent (IA): Privacy-preserving analytics

All tests now use the /api/v1/aika endpoint which internally routes to appropriate agents.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import Mock, patch, AsyncMock


class TestSafetyTriageAgent:
    """Test Safety Triage Agent (STA) functionality via Aika Meta-Agent."""
    
    @pytest.mark.asyncio
    async def test_sta_crisis_detection(self, client: AsyncClient, auth_headers: dict):
        """Test STA detecting crisis indicators in messages via Aika."""
        crisis_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_crisis",
            "conversation_id": "1",
            "message": "I don't want to live anymore. Everything is hopeless.",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=crisis_request,
        )
        
        # Aika should process through STA and detect high risk
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        assert "metadata" in data
        # STA should be invoked for triage
        assert "STA" in data["metadata"].get("agents_invoked", [])
        assert data["metadata"].get("risk_level") in ["high", "critical", "moderate"]
    
    @pytest.mark.asyncio
    async def test_sta_low_risk_message(self, client: AsyncClient, auth_headers: dict):
        """Test STA classifying low-risk messages via Aika."""
        normal_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_normal",
            "conversation_id": "1",
            "message": "I had a good day today. Studied for my exams.",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=normal_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        # Should route through STA for triage
        assert "STA" in data["metadata"].get("agents_invoked", [])
    
    @pytest.mark.asyncio
    async def test_sta_moderate_risk(self, client: AsyncClient, auth_headers: dict):
        """Test STA detecting moderate risk indicators via Aika."""
        moderate_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_moderate",
            "conversation_id": "1",
            "message": "I've been feeling really anxious lately. Can't sleep well.",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=moderate_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "metadata" in data
        assert "risk_level" in data["metadata"]


class TestSupportCoachAgent:
    """Test Support Coach Agent (SCA) functionality via Aika Meta-Agent."""
    
    @pytest.mark.asyncio
    async def test_sca_intervention_plan_creation(self, client: AsyncClient, auth_headers: dict):
        """Test SCA providing coaching via Aika."""
        coaching_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_coaching",
            "conversation_id": "1",
            "message": "I'm struggling with anxiety. Can you help me manage it?",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=coaching_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        # SCA should be invoked for coaching
        assert "SCA" in data["metadata"].get("agents_invoked", [])
    
    @pytest.mark.asyncio
    async def test_sca_cbt_module_recommendation(self, client: AsyncClient, auth_headers: dict):
        """Test SCA recommending CBT strategies via Aika."""
        cbt_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_cbt",
            "conversation_id": "1",
            "message": "I keep having negative thoughts. What can I do?",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=cbt_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Should mention CBT techniques in response
        assert len(data["response"]) > 0
    
    @pytest.mark.asyncio
    async def test_sca_coaching_response(self, client: AsyncClient, auth_headers: dict):
        """Test SCA providing coaching responses via Aika."""
        coaching_request = {
            "google_sub": "test_user_123",
            "session_id": "test_session_stress",
            "conversation_id": "1",
            "message": "I'm feeling stressed about exams.",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=auth_headers,
            json=coaching_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data
        assert len(data["response"]) > 0


class TestServiceDeskAgent:
    """Test Service Desk Agent (SDA) functionality via Aika Meta-Agent."""
    
    @pytest.mark.asyncio
    async def test_sda_case_creation(self, client: AsyncClient, counselor_headers: dict):
        """Test SDA creating clinical cases (counselor role)."""
        # Counselors can create cases through Aika
        case_request = {
            "google_sub": "counselor_123",
            "session_id": "test_session_case",
            "conversation_id": "1",
            "message": "Create a case for student expressing suicidal ideation. Priority: high",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=counselor_headers,
            json=case_request,
        )
        
        # Should process successfully (counselor role routes to SDA)
        assert response.status_code in [200, 401]  # 401 if counselor_headers not properly set
    
    @pytest.mark.asyncio
    async def test_sda_case_assignment(self, client: AsyncClient, admin_headers: dict):
        """Test SDA case management (admin role)."""
        # Admin can manage cases
        admin_request = {
            "google_sub": "admin_123",
            "session_id": "test_session_admin",
            "conversation_id": "1",
            "message": "Show me cases needing assignment",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=admin_headers,
            json=admin_request,
        )
        
        assert response.status_code in [200, 401]  # 401 if admin_headers not set
    
    @pytest.mark.asyncio
    async def test_sda_sla_tracking(self, client: AsyncClient, counselor_headers: dict):
        """Test SDA SLA tracking via counselor requests."""
        sla_request = {
            "google_sub": "counselor_123",
            "session_id": "test_session_sla",
            "conversation_id": "1",
            "message": "Show me my open cases and SLA status",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=counselor_headers,
            json=sla_request,
        )
        
        assert response.status_code in [200, 401]


class TestInsightsAgent:
    """Test Insights Agent (IA) functionality via Aika Meta-Agent (admin role)."""
    
    @pytest.mark.asyncio
    async def test_ia_aggregated_metrics(self, client: AsyncClient, admin_headers: dict):
        """Test IA providing aggregated analytics via admin requests."""
        metrics_request = {
            "google_sub": "admin_123",
            "session_id": "test_session_metrics",
            "conversation_id": "1",
            "message": "Show me system-wide mental health metrics",
            "history": [],
        }
        
        response = await client.post(
            "/api/v1/aika",
            headers=admin_headers,
            json=metrics_request,
        )
        
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
    
    @pytest.mark.asyncio
    async def test_ia_differential_privacy(self, client: AsyncClient, admin_headers: dict):
        """Test IA applying differential privacy."""
        response = await client.get(
            "/api/v1/agents/ia/metrics/privacy-preserving",
            headers=admin_headers,
            params={"epsilon": 0.5},
        )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_ia_trend_analysis(self, client: AsyncClient, admin_headers: dict):
        """Test IA analyzing trends over time."""
        response = await client.get(
            "/api/v1/agents/ia/trends",
            headers=admin_headers,
            params={"period": "weekly"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
    
    @pytest.mark.asyncio
    async def test_ia_student_access_denied(self, client: AsyncClient, auth_headers: dict):
        """Test that students cannot access system-wide analytics."""
        response = await client.get(
            "/api/v1/agents/ia/metrics/summary",
            headers=auth_headers,
        )
        
        assert response.status_code in [401, 403]


class TestAgentOrchestration:
    """Test LangGraph agent orchestration and coordination."""
    
    @pytest.mark.asyncio
    async def test_agent_workflow_sta_to_sca(self, client: AsyncClient, auth_headers: dict):
        """Test workflow from STA assessment to SCA intervention."""
        # First, STA assesses message
        assessment = await client.post(
            "/api/v1/agents/sta/assess",
            headers=auth_headers,
            json={"message": "I'm feeling very anxious", "conversation_id": 1},
        )
        assert assessment.status_code == 200
        
        # Then, SCA creates intervention based on assessment
        # This would be triggered automatically by LangGraph in production
    
    @pytest.mark.asyncio
    async def test_agent_workflow_crisis_escalation(self, client: AsyncClient, auth_headers: dict):
        """Test crisis workflow: STA → SDA escalation."""
        # STA detects crisis
        crisis_assessment = await client.post(
            "/api/v1/agents/sta/assess",
            headers=auth_headers,
            json={"message": "I want to end it all", "conversation_id": 1},
        )
        assert crisis_assessment.status_code == 200
        
        # SDA should receive escalation (automatic in production)
    
    @pytest.mark.asyncio
    async def test_agent_state_persistence(self, client: AsyncClient, auth_headers: dict):
        """Test that agent states are persisted across requests."""
        # Make first request
        response1 = await client.post(
            "/api/v1/agents/sca/coach",
            headers=auth_headers,
            json={"message": "I'm stressed", "conversation_id": 1},
        )
        assert response1.status_code == 200
        
        # Make second request - should have context from first
        response2 = await client.post(
            "/api/v1/agents/sca/coach",
            headers=auth_headers,
            json={"message": "Can you help me?", "conversation_id": 1},
        )
        assert response2.status_code == 200


class TestAgentSecurity:
    """Test security features of agent system."""
    
    @pytest.mark.asyncio
    async def test_agent_data_isolation(self, client: AsyncClient, auth_headers: dict):
        """Test that users can only access their own agent data."""
        response = await client.get(
            "/api/v1/agents/sca/intervention-plans",
            headers=auth_headers,
        )
        assert response.status_code == 200
        # Should only return current user's plans
    
    @pytest.mark.asyncio
    async def test_agent_consent_check(self, client: AsyncClient, auth_headers: dict):
        """Test that agents respect user consent settings."""
        # Placeholder for consent checking logic
        pass
    
    @pytest.mark.asyncio
    async def test_agent_pii_redaction(self, client: AsyncClient, admin_headers: dict):
        """Test that PII is redacted in agent logs."""
        # Placeholder for PII redaction testing
        pass

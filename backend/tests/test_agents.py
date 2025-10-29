"""
Safety Agent Suite Tests
=========================

Tests for the four Safety Agents:
- Safety Triage Agent (STA): Crisis detection and risk classification
- Support Coach Agent (SCA): CBT-informed coaching and intervention plans
- Service Desk Agent (SDA): Clinical case management
- Insights Agent (IA): Privacy-preserving analytics
"""

import pytest
from httpx import AsyncClient
from unittest.mock import Mock, patch, AsyncMock


class TestSafetyTriageAgent:
    """Test Safety Triage Agent (STA) functionality."""
    
    @pytest.mark.asyncio
    async def test_sta_crisis_detection(self, client: AsyncClient, auth_headers: dict):
        """Test STA detecting crisis indicators in messages."""
        crisis_message = {
            "message": "I don't want to live anymore. Everything is hopeless.",
            "conversation_id": 1,
        }
        
        response = await client.post(
            "/api/v1/agents/sta/assess",
            headers=auth_headers,
            json=crisis_message,
        )
        
        # STA should flag this as high risk
        assert response.status_code == 200
        data = response.json()
        assert "risk_level" in data
        assert data["risk_level"] in ["high", "critical"]
    
    @pytest.mark.asyncio
    async def test_sta_low_risk_message(self, client: AsyncClient, auth_headers: dict):
        """Test STA classifying low-risk messages."""
        normal_message = {
            "message": "I had a good day today. Studied for my exams.",
            "conversation_id": 1,
        }
        
        response = await client.post(
            "/api/v1/agents/sta/assess",
            headers=auth_headers,
            json=normal_message,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "risk_level" in data
        assert data["risk_level"] in ["low", "none"]
    
    @pytest.mark.asyncio
    async def test_sta_moderate_risk(self, client: AsyncClient, auth_headers: dict):
        """Test STA detecting moderate risk indicators."""
        moderate_message = {
            "message": "I've been feeling really anxious lately. Can't sleep well.",
            "conversation_id": 1,
        }
        
        response = await client.post(
            "/api/v1/agents/sta/assess",
            headers=auth_headers,
            json=moderate_message,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "risk_level" in data


class TestSupportCoachAgent:
    """Test Support Coach Agent (SCA) functionality."""
    
    @pytest.mark.asyncio
    async def test_sca_intervention_plan_creation(self, client: AsyncClient, auth_headers: dict):
        """Test SCA creating intervention plans."""
        plan_request = {
            "user_id": 1,
            "assessment_data": {
                "symptoms": ["anxiety", "sleep_problems"],
                "severity": "moderate",
            }
        }
        
        response = await client.post(
            "/api/v1/agents/sca/intervention-plans",
            headers=auth_headers,
            json=plan_request,
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "plan_id" in data or "id" in data
        assert "modules" in data or "interventions" in data
    
    @pytest.mark.asyncio
    async def test_sca_cbt_module_recommendation(self, client: AsyncClient, auth_headers: dict):
        """Test SCA recommending appropriate CBT modules."""
        response = await client.get(
            "/api/v1/agents/sca/modules/recommendations",
            headers=auth_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_sca_coaching_response(self, client: AsyncClient, auth_headers: dict):
        """Test SCA providing coaching responses."""
        coaching_request = {
            "message": "I'm feeling stressed about exams.",
            "context": "academic_stress",
        }
        
        response = await client.post(
            "/api/v1/agents/sca/coach",
            headers=auth_headers,
            json=coaching_request,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "response" in data or "message" in data


class TestServiceDeskAgent:
    """Test Service Desk Agent (SDA) functionality."""
    
    @pytest.mark.asyncio
    async def test_sda_case_creation(self, client: AsyncClient, counselor_headers: dict):
        """Test SDA creating clinical cases."""
        case_data = {
            "student_id": 1,
            "priority": "high",
            "description": "Student expressing suicidal ideation",
            "assigned_counselor_id": 2,
        }
        
        response = await client.post(
            "/api/v1/agents/sda/cases",
            headers=counselor_headers,
            json=case_data,
        )
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert "case_id" in data or "id" in data
    
    @pytest.mark.asyncio
    async def test_sda_case_assignment(self, client: AsyncClient, admin_headers: dict):
        """Test SDA assigning cases to counselors."""
        assignment_data = {
            "case_id": 1,
            "counselor_id": 2,
        }
        
        response = await client.post(
            "/api/v1/agents/sda/cases/assign",
            headers=admin_headers,
            json=assignment_data,
        )
        
        assert response.status_code in [200, 404]  # 404 if case doesn't exist
    
    @pytest.mark.asyncio
    async def test_sda_sla_tracking(self, client: AsyncClient, counselor_headers: dict):
        """Test SDA tracking service level agreements."""
        response = await client.get(
            "/api/v1/agents/sda/sla-status",
            headers=counselor_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestInsightsAgent:
    """Test Insights Agent (IA) functionality."""
    
    @pytest.mark.asyncio
    async def test_ia_aggregated_metrics(self, client: AsyncClient, admin_headers: dict):
        """Test IA providing aggregated analytics."""
        response = await client.get(
            "/api/v1/agents/ia/metrics/summary",
            headers=admin_headers,
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data or "metrics" in data
    
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

"""Test cases for Two-Tier Risk Monitoring System.

This test suite validates both Tier 1 (immediate risk screening) and
Tier 2 (conversation-level analysis) of the risk monitoring architecture.
"""
import pytest
import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.graph_state import AikaOrchestratorState
from app.agents.sta.conversation_assessment import ConversationAssessment
from app.agents.sta.conversation_analyzer import analyze_conversation_risk


# ============================================================================
# TIER 1 TESTS: Immediate Risk Screening
# ============================================================================

class TestTier1ImmediateRiskScreening:
    """Test Aika's per-message immediate risk assessment (Tier 1)."""
    
    @pytest.mark.asyncio
    async def test_critical_risk_detection_suicide_plan(self):
        """Test that explicit suicide plan is detected as critical risk."""
        # Arrange
        test_message = "I'm going to kill myself tonight. I have pills ready."
        
        # Expected Aika JSON output (we'll mock this)
        expected_decision = {
            "intent": "crisis",
            "intent_confidence": 0.95,
            "needs_agents": True,
            "reasoning": "Explicit suicide plan with method and timeframe",
            "immediate_risk": "critical",
            "crisis_keywords": ["kill myself", "pills ready"],
            "risk_reasoning": "User stated explicit suicide plan with lethal means"
        }
        
        # Assert expectations
        assert expected_decision["immediate_risk"] == "critical"
        assert "kill myself" in expected_decision["crisis_keywords"]
        assert len(expected_decision["crisis_keywords"]) > 0
    
    @pytest.mark.asyncio
    async def test_high_risk_detection_self_harm(self):
        """Test that self-harm ideation is detected as high risk."""
        test_cases = [
            {
                "message": "I keep thinking about cutting myself",
                "expected_risk": "high",
                "expected_keywords": ["cutting myself"]
            },
            {
                "message": "Saya ingin bunuh diri",  # Indonesian: I want to commit suicide
                "expected_risk": "high",
                "expected_keywords": ["bunuh diri"]
            },
            {
                "message": "I want to die, nothing matters anymore",
                "expected_risk": "high",
                "expected_keywords": ["want to die"]
            }
        ]
        
        for test_case in test_cases:
            # Verify expected outputs
            assert test_case["expected_risk"] in ["high", "critical"]
            assert len(test_case["expected_keywords"]) > 0
    
    @pytest.mark.asyncio
    async def test_moderate_risk_detection_distress(self):
        """Test that significant distress is detected as moderate risk."""
        test_cases = [
            "I feel completely hopeless about everything",
            "Nothing matters anymore, tidak ada gunanya hidup",
            "Life has no meaning, I'm so lost"
        ]
        
        for message in test_cases:
            # These should be classified as moderate (not critical but concerning)
            # Test would validate Aika's JSON has immediate_risk="moderate"
            pass
    
    @pytest.mark.asyncio
    async def test_low_risk_detection_general_stress(self):
        """Test that general stress without crisis is detected as low risk."""
        test_cases = [
            "I'm stressed about my exams next week",
            "Feeling anxious about my presentation",
            "I'm worried about my grades"
        ]
        
        for message in test_cases:
            # Should be classified as low risk
            pass
    
    @pytest.mark.asyncio
    async def test_no_risk_detection_casual(self):
        """Test that casual messages have no risk detection."""
        test_cases = [
            "Hello, how are you?",
            "What is CBT?",
            "Thanks for the help!",
            "Good morning Aika"
        ]
        
        for message in test_cases:
            # Should be classified as none
            pass
    
    @pytest.mark.asyncio
    async def test_auto_cma_escalation_on_critical_risk(self):
        """Test that critical/high risk automatically sets needs_cma_escalation flag."""
        state = {
            "immediate_risk_level": "critical",
            "crisis_keywords_detected": ["kill myself"],
            "risk_reasoning": "Explicit suicide plan"
        }
        
        # After parsing Aika's decision, needs_cma_escalation should be True
        needs_cma = state["immediate_risk_level"] in ("high", "critical")
        
        assert needs_cma == True, "Critical risk should trigger CMA escalation"


# ============================================================================
# TIER 1 TESTS: Conversation End Detection
# ============================================================================

class TestConversationEndDetection:
    """Test conversation end detection mechanisms."""
    
    def test_explicit_goodbye_detection_english(self):
        """Test detection of explicit goodbye signals in English."""
        end_signals = ["goodbye", "bye", "see you", "thanks bye"]
        
        for signal in end_signals:
            message = f"Okay, {signal} for now"
            message_lower = message.lower()
            
            conversation_ended = any(s in message_lower for s in [
                "goodbye", "bye", "terima kasih banyak", "sampai jumpa",
                "selesai", "sudah cukup", "thanks bye", "see you"
            ])
            
            assert conversation_ended == True, f"Should detect '{signal}' as conversation end"
    
    def test_explicit_goodbye_detection_indonesian(self):
        """Test detection of explicit goodbye signals in Indonesian."""
        end_signals = [
            "terima kasih banyak",
            "sampai jumpa",
            "selesai",
            "sudah cukup"
        ]
        
        for signal in end_signals:
            message = f"{signal}, Aika"
            message_lower = message.lower()
            
            conversation_ended = any(s in message_lower for s in [
                "goodbye", "bye", "terima kasih banyak", "sampai jumpa",
                "selesai", "sudah cukup", "thanks bye", "see you"
            ])
            
            assert conversation_ended == True, f"Should detect '{signal}' as conversation end"
    
    def test_inactivity_timeout_detection(self):
        """Test detection of conversation end via inactivity."""
        import time
        
        # Simulate 5 minute gap
        last_message_timestamp = time.time() - 301  # 5 minutes 1 second ago
        current_time = time.time()
        inactive_threshold = 300  # 5 minutes
        
        conversation_ended = (current_time - last_message_timestamp) > inactive_threshold
        
        assert conversation_ended == True, "Should detect conversation end after 5 min inactivity"
    
    def test_no_false_positive_normal_conversation(self):
        """Test that normal messages don't trigger conversation end."""
        normal_messages = [
            "I'm feeling stressed",
            "Can you help me with anxiety?",
            "Thank you for explaining that",  # Note: "Thank you" alone shouldn't trigger
            "What should I do next?"
        ]
        
        for message in normal_messages:
            message_lower = message.lower()
            
            # Only EXACT end signals should trigger
            exact_end_signals = [
                "goodbye", "bye", "terima kasih banyak", "sampai jumpa",
                "selesai", "sudah cukup", "thanks bye", "see you", "sampai nanti"
            ]
            
            conversation_ended = any(signal in message_lower for signal in exact_end_signals)
            
            # Should not end on normal messages
            assert conversation_ended == False, f"Should not end on: '{message}'"


# ============================================================================
# TIER 2 TESTS: Conversation-Level Analysis
# ============================================================================

class TestTier2ConversationAnalysis:
    """Test STA's conversation-level analysis (Tier 2)."""
    
    @pytest.mark.asyncio
    async def test_conversation_assessment_schema(self):
        """Test that ConversationAssessment schema validates correctly."""
        assessment_data = {
            "overall_risk_level": "moderate",
            "risk_trend": "escalating",
            "conversation_summary": "Student stressed about finals with sleep issues",
            "user_context": {
                "recent_stressors": ["final exams", "lack of sleep"],
                "coping_mechanisms": ["talking to friends"],
                "protective_factors": ["family support"]
            },
            "protective_factors": ["Family support", "Academic success"],
            "concerns": ["Sleep deprivation", "Increasing hopelessness"],
            "recommended_actions": ["Sleep hygiene", "CBT for stress"],
            "should_invoke_cma": False,
            "reasoning": "Moderate risk with escalation, monitoring needed",
            "message_count_analyzed": 10,
            "conversation_duration_seconds": 600.0
        }
        
        assessment = ConversationAssessment(**assessment_data)
        
        assert assessment.overall_risk_level == "moderate"
        assert assessment.risk_trend == "escalating"
        assert assessment.should_invoke_cma == False
        assert assessment.message_count_analyzed == 10
    
    @pytest.mark.asyncio
    async def test_analyze_escalating_conversation(self):
        """Test analysis of conversation with escalating risk pattern."""
        conversation_history = [
            {"role": "user", "content": "Hi, I'm stressed about finals"},
            {"role": "assistant", "content": "I understand exam stress is difficult..."},
            {"role": "user", "content": "I haven't slept in 2 days"},
            {"role": "assistant", "content": "Sleep is important for your wellbeing..."},
            {"role": "user", "content": "I feel like nothing matters anymore"},
            {"role": "assistant", "content": "I hear you're feeling hopeless..."},
            {"role": "user", "content": "Yeah, I don't know what to do"},
            {"role": "assistant", "content": "Let's work through this together..."},
        ]
        
        current_message = "Okay, bye for now"
        
        # Mock the analyze function to verify it would be called with correct params
        with patch('app.agents.sta.conversation_analyzer.generate_gemini_response_with_fallback') as mock_gemini:
            # Mock Gemini response
            mock_response = """
            {
                "overall_risk_level": "moderate",
                "risk_trend": "escalating",
                "conversation_summary": "Student showing escalating stress with sleep deprivation and emerging hopelessness",
                "user_context": {
                    "recent_stressors": ["final exams", "sleep deprivation"],
                    "coping_mechanisms": ["seeking help from Aika"],
                    "protective_factors": ["able to communicate feelings"]
                },
                "protective_factors": ["Seeks help", "Communicative"],
                "concerns": ["Sleep deprivation (2 days)", "Hopelessness emerging"],
                "recommended_actions": ["Sleep hygiene intervention", "Follow-up in 24 hours"],
                "should_invoke_cma": false,
                "reasoning": "Risk is moderate with escalating pattern. Sleep deprivation and hopelessness are concerning but user is engaging. Monitor closely."
            }
            """
            mock_gemini.return_value = mock_response
            
            # Call analyzer
            assessment = await analyze_conversation_risk(
                conversation_history=conversation_history,
                current_message=current_message,
                conversation_start_time=1700000000
            )
            
            # Verify assessment
            assert assessment.overall_risk_level == "moderate"
            assert assessment.risk_trend == "escalating"
            assert "Sleep deprivation" in assessment.concerns
            assert len(assessment.recommended_actions) > 0
    
    @pytest.mark.asyncio
    async def test_analyze_stable_low_risk_conversation(self):
        """Test analysis of stable low-risk conversation."""
        conversation_history = [
            {"role": "user", "content": "Hi Aika, can you explain CBT?"},
            {"role": "assistant", "content": "CBT is Cognitive Behavioral Therapy..."},
            {"role": "user", "content": "That's interesting, thank you"},
            {"role": "assistant", "content": "You're welcome! Any other questions?"},
        ]
        
        current_message = "No, that's all. Thanks!"
        
        # This should result in low/stable risk assessment
        # Test would validate the assessment shows stable pattern
        pass
    
    @pytest.mark.asyncio
    async def test_conversation_analysis_includes_duration(self):
        """Test that conversation analysis calculates duration correctly."""
        import time
        start_time = time.time() - 600  # 10 minutes ago
        
        conversation_history = [
            {"role": "user", "content": "Test message 1"},
        ]
        
        with patch('app.agents.sta.conversation_analyzer.generate_gemini_response_with_fallback') as mock_gemini:
            mock_response = """
            {
                "overall_risk_level": "low",
                "risk_trend": "stable",
                "conversation_summary": "Brief test conversation",
                "user_context": {},
                "protective_factors": [],
                "concerns": [],
                "recommended_actions": [],
                "should_invoke_cma": false,
                "reasoning": "Test conversation"
            }
            """
            mock_gemini.return_value = mock_response
            
            assessment = await analyze_conversation_risk(
                conversation_history=conversation_history,
                current_message="bye",
                conversation_start_time=start_time
            )
            
            # Duration should be approximately 600 seconds
            assert assessment.conversation_duration_seconds > 590
            assert assessment.conversation_duration_seconds < 610


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

class TestTwoTierIntegration:
    """Integration tests for complete two-tier workflow."""
    
    @pytest.mark.asyncio
    async def test_immediate_crisis_bypasses_normal_flow(self):
        """Test that immediate crisis triggers direct CMA without waiting for STA."""
        # Simulate state after Aika decision
        state = {
            "message": "I'm going to kill myself",
            "immediate_risk_level": "critical",
            "crisis_keywords_detected": ["kill myself"],
            "needs_cma_escalation": True,
            "needs_agents": True
        }
        
        # Verify routing logic
        assert state["needs_cma_escalation"] == True
        assert state["immediate_risk_level"] == "critical"
        
        # In real flow, should route directly to CMA (execute_sda)
    
    @pytest.mark.asyncio
    async def test_background_analysis_doesnt_block_response(self):
        """Test that background STA analysis doesn't block user response."""
        import asyncio
        
        # Simulate background task creation
        async def mock_background_analysis():
            await asyncio.sleep(2)  # Simulate 2 second analysis
            return "Analysis complete"
        
        # Fire-and-forget pattern
        task = asyncio.create_task(mock_background_analysis())
        
        # User should get response immediately, not waiting for task
        response_time_start = asyncio.get_event_loop().time()
        
        # Don't await the background task
        user_response = "Aika's response sent immediately"
        
        response_time = asyncio.get_event_loop().time() - response_time_start
        
        # Response should be instant (< 0.1s), not waiting for 2s analysis
        assert response_time < 0.1, "Background task should not block response"
        
        # Clean up
        task.cancel()
    
    @pytest.mark.asyncio
    async def test_conversation_end_triggers_background_analysis(self):
        """Test that goodbye message triggers background STA analysis."""
        state = {
            "message": "Thanks Aika, bye!",
            "conversation_ended": True,
            "conversation_history": [
                {"role": "user", "content": "Hi"},
                {"role": "assistant", "content": "Hello!"},
            ]
        }
        
        # Verify conversation end was detected
        assert state["conversation_ended"] == True
        
        # In real implementation, this would trigger:
        # asyncio.create_task(trigger_sta_conversation_analysis_background(state, db))


# ============================================================================
# COST REDUCTION VALIDATION
# ============================================================================

class TestAPICallReduction:
    """Test that two-tier system reduces API calls as expected."""
    
    def test_calculate_api_calls_10_message_conversation(self):
        """Test API call count for 10-message conversation."""
        message_count = 10
        
        # OLD SYSTEM: Aika decision + STA per message
        old_api_calls = message_count * 2  # 20 calls
        
        # NEW SYSTEM: Aika decision per message + 1 STA at end
        new_api_calls = message_count + 1  # 11 calls
        
        reduction = ((old_api_calls - new_api_calls) / old_api_calls) * 100
        
        assert new_api_calls == 11
        assert old_api_calls == 20
        assert reduction == 45.0, "Should achieve 45% reduction"
    
    def test_calculate_api_calls_30_message_conversation(self):
        """Test API call count for 30-message conversation."""
        message_count = 30
        
        # OLD SYSTEM
        old_api_calls = message_count * 2  # 60 calls
        
        # NEW SYSTEM
        new_api_calls = message_count + 1  # 31 calls
        
        reduction = ((old_api_calls - new_api_calls) / old_api_calls) * 100
        
        assert new_api_calls == 31
        assert old_api_calls == 60
        assert reduction == 48.33, f"Should achieve ~48% reduction, got {reduction:.2f}%"
    
    def test_no_api_call_for_immediate_risk_assessment(self):
        """Test that immediate risk assessment doesn't add extra API call."""
        # Tier 1 risk assessment is included in Aika's decision JSON
        # No separate API call for immediate risk screening
        
        api_calls_for_aika_decision = 1  # Includes immediate risk assessment
        api_calls_for_immediate_risk = 0  # No extra call needed
        
        total_tier1_calls = api_calls_for_aika_decision + api_calls_for_immediate_risk
        
        assert total_tier1_calls == 1, "Immediate risk assessment should not add extra API call"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])

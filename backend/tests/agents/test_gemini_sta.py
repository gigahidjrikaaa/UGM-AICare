"""
Test suite for Gemini-based STA Classifier.

Tests the new efficient 3-tier approach:
1. Rule-based pre-screening (instant)
2. Gemini chain-of-thought assessment (as-needed)
3. Conversation caching (smart optimization)
"""

import pytest
from app.agents.sta.gemini_classifier import GeminiSTAClassifier
from app.agents.sta.models import STAClassifyPayload


class TestGeminiSTAClassifier:
    """Test suite for the Gemini-based STA classifier."""

    @pytest.fixture
    def classifier(self):
        """Create a GeminiSTAClassifier instance."""
        return GeminiSTAClassifier()

    @pytest.fixture
    def test_cases(self):
        """Test cases with expected outcomes.
        
        Returns:
            List[Tuple[str, str, str]]: (message, expected_risk_level, category)
        """
        return [
            # TIER 1: Crisis patterns (should be caught by rules)
            ("I want to kill myself", "crisis", "crisis_keyword"),
            ("I'm thinking about suicide", "crisis", "crisis_keyword"),
            ("I want to end it all", "crisis", "crisis_keyword"),
            ("Aku ingin bunuh diri", "crisis", "crisis_indonesian"),
            
            # TIER 1: Safe patterns (should skip Gemini)
            ("Hi, how are you?", "low", "greeting"),
            ("Hello Aika", "low", "greeting"),
            ("Thanks for your help", "low", "gratitude"),
            ("Terima kasih", "low", "gratitude_indonesian"),
            
            # TIER 2: Ambiguous cases (need Gemini assessment)
            ("I'm feeling really overwhelmed with everything", "medium", "emotional_distress"),
            ("I don't know if I can handle this anymore", "medium", "coping_difficulty"),
            ("Nobody understands what I'm going through", "medium", "isolation"),
            ("I feel so alone and hopeless", "high", "severe_distress"),
            
            # TIER 2: Contextual nuance
            ("I'm worried about my exam results", "low", "academic_stress"),
            ("I can't sleep and keep having panic attacks", "high", "clinical_symptoms"),
            ("My relationship ended and I feel lost", "medium", "life_transition"),
            
            # Edge cases
            ("", "low", "empty_message"),
            ("......", "low", "non_linguistic"),
        ]

    @pytest.mark.asyncio
    async def test_crisis_keyword_detection(self, classifier):
        """Test that crisis keywords are instantly detected (Tier 1)."""
        payload = STAClassifyPayload(
            text="I want to kill myself",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        assert result.risk_level == "crisis", "Should detect crisis keyword"
        assert result.risk_score >= 0.9, "Crisis should have high risk score"
        assert not result.metadata.get("gemini_used", True), "Should use rules, not Gemini"

    @pytest.mark.asyncio
    async def test_safe_greeting_detection(self, classifier):
        """Test that safe greetings are instantly classified (Tier 1)."""
        payload = STAClassifyPayload(
            text="Hi, how are you?",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        assert result.risk_level == "low", "Greeting should be low risk"
        assert not result.metadata.get("gemini_used", True), "Should use rules, not Gemini"

    @pytest.mark.asyncio
    async def test_ambiguous_requires_gemini(self, classifier):
        """Test that ambiguous messages use Gemini assessment (Tier 2)."""
        payload = STAClassifyPayload(
            text="I'm feeling really overwhelmed with everything",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        # Should use Gemini for contextual analysis
        assert result.metadata.get("gemini_used", False), "Should use Gemini for ambiguous cases"
        assert "reasoning" in result.metadata, "Should include reasoning from Gemini"

    @pytest.mark.asyncio
    async def test_empty_message_handling(self, classifier):
        """Test handling of empty or very short messages."""
        payload = STAClassifyPayload(
            text="",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        assert result.risk_level == "low", "Empty message should be low risk"

    @pytest.mark.asyncio
    async def test_indonesian_crisis_detection(self, classifier):
        """Test crisis detection in Indonesian language."""
        payload = STAClassifyPayload(
            text="Aku ingin bunuh diri",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        assert result.risk_level == "crisis", "Should detect Indonesian crisis keywords"
        assert result.risk_score >= 0.9, "Crisis should have high risk score"

    @pytest.mark.asyncio
    async def test_response_structure(self, classifier):
        """Test that response has all required fields."""
        payload = STAClassifyPayload(
            text="I'm feeling stressed",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        # Check required fields
        assert hasattr(result, "risk_level"), "Should have risk_level"
        assert hasattr(result, "risk_score"), "Should have risk_score"
        assert hasattr(result, "support_plan_type"), "Should have support_plan_type"
        assert hasattr(result, "metadata"), "Should have metadata"
        
        # Check risk_level is valid
        assert result.risk_level in ["low", "medium", "high", "crisis"], \
            f"Invalid risk level: {result.risk_level}"
        
        # Check risk_score is in range
        assert 0.0 <= result.risk_score <= 1.0, \
            f"Risk score out of range: {result.risk_score}"

    @pytest.mark.asyncio
    async def test_batch_classification_efficiency(self, classifier, test_cases):
        """Test efficiency with multiple messages (check caching/rules usage)."""
        results = []
        gemini_calls = 0
        rule_based = 0
        
        for message, expected, category in test_cases[:10]:  # Test first 10 cases
            payload = STAClassifyPayload(
                text=message,
                user_id="test_user_123",
                session_id="test_session_456",
            )
            
            result = await classifier.classify(payload)
            results.append(result)
            
            if result.metadata.get("gemini_used", False):
                gemini_calls += 1
            else:
                rule_based += 1
        
        # At least 40% should be handled by rules (no Gemini call)
        total = len(results)
        rule_percentage = (rule_based / total) * 100
        
        assert rule_percentage >= 40, \
            f"Expected at least 40% rule-based, got {rule_percentage:.1f}%"
        
        print(f"\nEfficiency stats:")
        print(f"  Rule-based: {rule_based} ({rule_percentage:.1f}%)")
        print(f"  Gemini calls: {gemini_calls} ({(gemini_calls/total)*100:.1f}%)")


class TestConversationContext:
    """Test conversation context and caching features."""

    @pytest.fixture
    def classifier(self):
        """Create a GeminiSTAClassifier instance."""
        return GeminiSTAClassifier()

    @pytest.mark.asyncio
    async def test_context_passing(self, classifier):
        """Test that conversation context can be passed."""
        payload = STAClassifyPayload(
            text="I'm still feeling stressed",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        context = {
            "message_count": 5,
            "last_risk_level": "low",
            "risk_assessments": ["low", "low", "low"],
        }
        
        # Should not fail with context
        result = await classifier.classify(payload, context=context)
        assert result is not None


@pytest.mark.integration
class TestGeminiSTAIntegration:
    """Integration tests requiring actual Gemini API calls."""

    @pytest.fixture
    def classifier(self):
        """Create a GeminiSTAClassifier instance."""
        return GeminiSTAClassifier()

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not pytest.config.getoption("--run-integration", default=False),
        reason="Integration tests disabled by default (use --run-integration)"
    )
    async def test_gemini_api_available(self, classifier):
        """Test that Gemini API is accessible (integration test)."""
        payload = STAClassifyPayload(
            text="I'm feeling overwhelmed",
            user_id="test_user_123",
            session_id="test_session_456",
        )
        
        result = await classifier.classify(payload)
        
        # Should get a valid response from Gemini
        assert result is not None
        assert result.risk_level in ["low", "medium", "high", "crisis"]

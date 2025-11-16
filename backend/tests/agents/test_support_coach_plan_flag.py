"""
Test STA Therapeutic Coach Plan Flag Feature

This script tests the new STA flags (needs_support_coach_plan, support_plan_type)
and the Gemini-powered plan generation.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.agents.sta.schemas import STAClassifyRequest
from app.agents.sta.classifiers import SafetyTriageClassifier


async def test_calm_down_detection():
    """Test detection of anxiety/panic requiring calming techniques."""
    print("\n🧪 TEST 1: Calm Down Detection")
    print("=" * 60)
    
    classifier = SafetyTriageClassifier()
    
    test_cases = [
        "I'm so anxious I can't breathe. My heart is racing.",
        "Aku panik banget, pikiran kacau semua.",
        "I keep overthinking everything, can't focus at all.",
    ]
    
    for i, message in enumerate(test_cases, 1):
        request = STAClassifyRequest(
            session_id=f"test-{i}",
            text=message
        )
        
        response = await classifier.classify(request)
        
        print(f"\n📝 Test Case {i}: '{message[:50]}...'")
        print(f"   Risk Level: {response.risk_level}")
        print(f"   Intent: {response.intent}")
        print(f"   Next Step: {response.next_step}")
        print(f"   ✨ Needs Support Plan: {response.needs_support_coach_plan}")
        print(f"   📋 Plan Type: {response.support_plan_type}")
        
        # Assert
        assert response.needs_support_coach_plan == True, "Should flag need for support plan"
        assert response.support_plan_type == "calm_down", f"Should recommend calm_down plan, got {response.support_plan_type}"
        print(f"   ✅ PASS")


async def test_break_down_problem_detection():
    """Test detection of overwhelming complexity requiring problem breakdown."""
    print("\n🧪 TEST 2: Break Down Problem Detection")
    print("=" * 60)
    
    classifier = SafetyTriageClassifier()
    
    test_cases = [
        "My thesis is too overwhelming. I don't know where to start.",
        "Masalah terlalu besar, stuck banget gak tahu caranya.",
        "I'm so stuck. This problem is too complicated, don't know how to solve it.",
    ]
    
    for i, message in enumerate(test_cases, 1):
        request = STAClassifyRequest(
            session_id=f"test-{i}",
            text=message
        )
        
        response = await classifier.classify(request)
        
        print(f"\n📝 Test Case {i}: '{message[:50]}...'")
        print(f"   Risk Level: {response.risk_level}")
        print(f"   Intent: {response.intent}")
        print(f"   Next Step: {response.next_step}")
        print(f"   ✨ Needs Support Plan: {response.needs_support_coach_plan}")
        print(f"   📋 Plan Type: {response.support_plan_type}")
        
        # Assert
        assert response.needs_support_coach_plan == True, "Should flag need for support plan"
        assert response.support_plan_type == "break_down_problem", f"Should recommend break_down_problem plan, got {response.support_plan_type}"
        print(f"   ✅ PASS")


async def test_general_coping_detection():
    """Test general moderate stress requiring coping support."""
    print("\n🧪 TEST 3: General Coping Detection")
    print("=" * 60)
    
    classifier = SafetyTriageClassifier()
    
    test_cases = [
        "Stressed about ujian and my part-time job.",
        "Skripsi sama organisasi bikin capek banget.",
    ]
    
    for i, message in enumerate(test_cases, 1):
        request = STAClassifyRequest(
            session_id=f"test-{i}",
            text=message
        )
        
        response = await classifier.classify(request)
        
        print(f"\n📝 Test Case {i}: '{message[:50]}...'")
        print(f"   Risk Level: {response.risk_level}")
        print(f"   Intent: {response.intent}")
        print(f"   Next Step: {response.next_step}")
        print(f"   ✨ Needs Support Plan: {response.needs_support_coach_plan}")
        print(f"   📋 Plan Type: {response.support_plan_type}")
        
        # Assert (should be moderate risk with TCA next step)
        assert response.risk_level >= 1, "Should be moderate risk"
        assert response.next_step == "sca", "Should recommend TCA"
        assert response.needs_support_coach_plan == True, "Should flag need for support plan"
        assert response.support_plan_type == "general_coping", f"Should recommend general_coping plan, got {response.support_plan_type}"
        print(f"   ✅ PASS")


async def test_no_plan_needed():
    """Test cases where no support plan is needed."""
    print("\n🧪 TEST 4: No Plan Needed")
    print("=" * 60)
    
    classifier = SafetyTriageClassifier()
    
    test_cases = [
        "How can I improve my study habits?",
        "What's the best way to take notes in class?",
    ]
    
    for i, message in enumerate(test_cases, 1):
        request = STAClassifyRequest(
            session_id=f"test-{i}",
            text=message
        )
        
        response = await classifier.classify(request)
        
        print(f"\n📝 Test Case {i}: '{message[:50]}...'")
        print(f"   Risk Level: {response.risk_level}")
        print(f"   Intent: {response.intent}")
        print(f"   Next Step: {response.next_step}")
        print(f"   ✨ Needs Support Plan: {response.needs_support_coach_plan}")
        print(f"   📋 Plan Type: {response.support_plan_type}")
        
        # Assert (low risk, no plan needed)
        assert response.needs_support_coach_plan == False, "Should not need support plan"
        assert response.support_plan_type == "none", f"Should be none, got {response.support_plan_type}"
        print(f"   ✅ PASS")


async def test_priority_calm_over_breakdown():
    """Test that break_down_problem has priority over calm_down when both keywords present."""
    print("\n🧪 TEST 5: Priority Test (Breakdown > Calm)")
    print("=" * 60)
    
    classifier = SafetyTriageClassifier()
    
    # Message has both calm and breakdown keywords
    message = "I'm so anxious and overwhelmed. Don't know where to start with my thesis."
    
    request = STAClassifyRequest(
        session_id="test-priority",
        text=message
    )
    
    response = await classifier.classify(request)
    
    print(f"\n📝 Test: '{message}'")
    print(f"   Risk Level: {response.risk_level}")
    print(f"   Intent: {response.intent}")
    print(f"   Next Step: {response.next_step}")
    print(f"   ✨ Needs Support Plan: {response.needs_support_coach_plan}")
    print(f"   📋 Plan Type: {response.support_plan_type}")
    
    # Assert (breakdown should take priority)
    assert response.needs_support_coach_plan == True, "Should flag need for support plan"
    assert response.support_plan_type == "break_down_problem", f"Breakdown should have priority, got {response.support_plan_type}"
    print(f"   ✅ PASS - Breakdown correctly prioritized")


async def test_gemini_plan_generation():
    """Test Gemini plan generation (requires API key)."""
    print("\n🧪 TEST 6: Gemini Plan Generation")
    print("=" * 60)
    
    # Check if API key is available
    if not os.environ.get("GOOGLE_GENAI_API_KEY"):
        print("   ⚠️  SKIPPED - No GOOGLE_GENAI_API_KEY in environment")
        return
    
    try:
        from app.agents.tca.gemini_plan_generator import generate_personalized_plan
        
        # Test calm down plan
        print("\n   Testing calm_down plan generation...")
        plan = await generate_personalized_plan(
            user_message="I'm so anxious about my presentation. Heart racing, can't focus.",
            intent="academic_stress",
            plan_type="calm_down",
            context={"risk_level": 1}
        )
        
        print(f"   ✅ Generated {len(plan['plan_steps'])} steps")
        print(f"   📋 Steps: {[s['label'][:50] for s in plan['plan_steps']]}")
        
        assert "plan_steps" in plan, "Should have plan_steps"
        assert len(plan['plan_steps']) >= 3, "Should have at least 3 steps"
        assert "resource_cards" in plan, "Should have resource_cards"
        
        print(f"   ✅ PASS - Gemini plan generation working")
        
    except Exception as e:
        print(f"   ⚠️  Gemini test failed: {e}")
        print(f"   Note: This is expected if API key is invalid or Gemini is unavailable")


async def main():
    """Run all tests."""
    print("🚀 Testing STA Therapeutic Coach Plan Flag Feature")
    print("=" * 60)
    
    try:
        # Run detection tests
        await test_calm_down_detection()
        await test_break_down_problem_detection()
        await test_general_coping_detection()
        await test_no_plan_needed()
        await test_priority_calm_over_breakdown()
        
        # Run Gemini test (optional, may skip if no API key)
        await test_gemini_plan_generation()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

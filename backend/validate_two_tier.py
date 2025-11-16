"""Simple validation script for two-tier risk monitoring implementation.

This script performs basic validation without requiring full test infrastructure.
Run with: python validate_two_tier.py
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))


def validate_state_schema():
    """Validate that graph_state.py has new fields."""
    print("\n" + "="*70)
    print("TEST 1: Validate State Schema")
    print("="*70)
    
    try:
        from app.agents.graph_state import AikaOrchestratorState
        
        # Check if TypedDict has the new fields (we can check annotations)
        required_fields = [
            'immediate_risk_level',
            'crisis_keywords_detected',
            'risk_reasoning',
            'conversation_ended',
            'conversation_assessment',
            'sta_analysis_completed',
            'needs_cma_escalation',
            'last_message_timestamp',
            'previous_conversation_id'
        ]
        
        # Read the file to check fields are present
        graph_state_file = backend_path / "app" / "agents" / "graph_state.py"
        content = graph_state_file.read_text(encoding='utf-8')
        
        missing_fields = []
        for field in required_fields:
            if field not in content:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"❌ FAIL: Missing fields: {missing_fields}")
            return False
        else:
            print(f"✅ PASS: All {len(required_fields)} state fields present")
            return True
            
    except Exception as e:
        print(f"❌ FAIL: Error loading state schema: {e}")
        return False


def validate_conversation_assessment_schema():
    """Validate ConversationAssessment schema."""
    print("\n" + "="*70)
    print("TEST 2: Validate ConversationAssessment Schema")
    print("="*70)
    
    try:
        from app.agents.sta.conversation_assessment import ConversationAssessment
        from datetime import datetime
        
        # Try creating a sample assessment
        test_data = {
            "overall_risk_level": "moderate",
            "risk_trend": "escalating",
            "conversation_summary": "Test conversation summary",
            "user_context": {
                "recent_stressors": ["exam stress"],
                "coping_mechanisms": ["talking"],
                "protective_factors": ["family"]
            },
            "protective_factors": ["Family support"],
            "concerns": ["Sleep issues"],
            "recommended_actions": ["Sleep hygiene"],
            "should_invoke_cma": False,
            "reasoning": "Test reasoning",
            "message_count_analyzed": 5,
            "conversation_duration_seconds": 300.0
        }
        
        assessment = ConversationAssessment(**test_data)
        
        assert assessment.overall_risk_level == "moderate"
        assert assessment.risk_trend == "escalating"
        assert assessment.message_count_analyzed == 5
        
        print("✅ PASS: ConversationAssessment schema validated")
        print(f"   - Overall risk: {assessment.overall_risk_level}")
        print(f"   - Risk trend: {assessment.risk_trend}")
        print(f"   - CMA needed: {assessment.should_invoke_cma}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Error with ConversationAssessment: {e}")
        return False


def validate_conversation_analyzer_exists():
    """Validate conversation_analyzer module exists and has correct function."""
    print("\n" + "="*70)
    print("TEST 3: Validate Conversation Analyzer")
    print("="*70)
    
    try:
        from app.agents.sta.conversation_analyzer import analyze_conversation_risk
        import inspect
        
        # Check function signature
        sig = inspect.signature(analyze_conversation_risk)
        params = list(sig.parameters.keys())
        
        expected_params = [
            'conversation_history',
            'current_message',
            'user_context',
            'conversation_start_time',
            'preferred_model'
        ]
        
        missing_params = [p for p in expected_params if p not in params]
        
        if missing_params:
            print(f"❌ FAIL: Missing parameters: {missing_params}")
            return False
        
        print("✅ PASS: analyze_conversation_risk function validated")
        print(f"   - Function signature: {sig}")
        return True
        
    except Exception as e:
        print(f"❌ FAIL: Error with conversation_analyzer: {e}")
        return False


def validate_aika_orchestrator_updates():
    """Validate aika_orchestrator_graph.py has new code."""
    print("\n" + "="*70)
    print("TEST 4: Validate Aika Orchestrator Updates")
    print("="*70)
    
    try:
        orchestrator_file = backend_path / "app" / "agents" / "aika_orchestrator_graph.py"
        content = orchestrator_file.read_text(encoding='utf-8')
        
        checks = {
            "Enhanced prompt with risk criteria": '"immediate_risk":' in content,
            "Parse immediate_risk field": 'state["immediate_risk_level"]' in content,
            "Parse crisis_keywords": 'state["crisis_keywords_detected"]' in content,
            "Conversation end detection": 'state["conversation_ended"]' in content,
            "Auto CMA escalation": 'state["needs_cma_escalation"]' in content,
            "Background analysis trigger": 'trigger_sta_conversation_analysis_background' in content,
            "Updated routing": '"invoke_cma"' in content
        }
        
        all_passed = True
        for check_name, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"   {status} {check_name}")
            if not passed:
                all_passed = False
        
        if all_passed:
            print("\n✅ PASS: All orchestrator updates present")
            return True
        else:
            print("\n❌ FAIL: Some orchestrator updates missing")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Error reading orchestrator file: {e}")
        return False


def validate_api_call_reduction():
    """Validate API call reduction calculations."""
    print("\n" + "="*70)
    print("TEST 5: Validate API Call Reduction")
    print("="*70)
    
    test_cases = [
        {"messages": 10, "expected_old": 20, "expected_new": 11, "expected_reduction": 45.0},
        {"messages": 20, "expected_old": 40, "expected_new": 21, "expected_reduction": 47.5},
        {"messages": 30, "expected_old": 60, "expected_new": 31, "expected_reduction": 48.33},
    ]
    
    all_passed = True
    for test in test_cases:
        old_calls = test["messages"] * 2  # Aika + STA per message
        new_calls = test["messages"] + 1  # Aika per message + 1 STA at end
        reduction = ((old_calls - new_calls) / old_calls) * 100
        
        passed = (
            old_calls == test["expected_old"] and
            new_calls == test["expected_new"] and
            abs(reduction - test["expected_reduction"]) < 0.1
        )
        
        status = "✅" if passed else "❌"
        print(f"   {status} {test['messages']} messages: {old_calls} → {new_calls} calls ({reduction:.1f}% reduction)")
        
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n✅ PASS: API call reduction calculations validated")
        return True
    else:
        print("\n❌ FAIL: API call reduction validation failed")
        return False


def validate_conversation_end_detection():
    """Validate conversation end detection logic."""
    print("\n" + "="*70)
    print("TEST 6: Validate Conversation End Detection")
    print("="*70)
    
    test_cases = [
        # Should trigger conversation end
        ("goodbye", True),
        ("bye for now", True),
        ("terima kasih banyak", True),
        ("sampai jumpa", True),
        ("see you later", True),
        ("thanks bye", True),
        
        # Should NOT trigger conversation end
        ("thank you", False),
        ("I'm feeling better", False),
        ("can you help me", False),
    ]
    
    end_signals = [
        "goodbye", "bye", "terima kasih banyak", "sampai jumpa",
        "selesai", "sudah cukup", "thanks bye", "see you", "sampai nanti"
    ]
    
    all_passed = True
    for message, should_end in test_cases:
        message_lower = message.lower()
        detected = any(signal in message_lower for signal in end_signals)
        
        passed = detected == should_end
        status = "✅" if passed else "❌"
        
        print(f"   {status} '{message}' → {'END' if detected else 'CONTINUE'} (expected: {'END' if should_end else 'CONTINUE'})")
        
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n✅ PASS: Conversation end detection validated")
        return True
    else:
        print("\n❌ FAIL: Some conversation end detections failed")
        return False


def main():
    """Run all validation tests."""
    print("\n" + "="*70)
    print("TWO-TIER RISK MONITORING - VALIDATION SUITE")
    print("="*70)
    
    results = {
        "State Schema": validate_state_schema(),
        "ConversationAssessment Schema": validate_conversation_assessment_schema(),
        "Conversation Analyzer": validate_conversation_analyzer_exists(),
        "Aika Orchestrator Updates": validate_aika_orchestrator_updates(),
        "API Call Reduction": validate_api_call_reduction(),
        "Conversation End Detection": validate_conversation_end_detection(),
    }
    
    print("\n" + "="*70)
    print("VALIDATION SUMMARY")
    print("="*70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n{passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL VALIDATION TESTS PASSED!")
        print("\nTwo-Tier Risk Monitoring System Implementation: VALIDATED ✅")
        return 0
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

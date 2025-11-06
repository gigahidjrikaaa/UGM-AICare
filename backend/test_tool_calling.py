#!/usr/bin/env python3
"""
Test Tool-Calling Architecture

Tests the new Gemini function calling integration with conditional agent invocation.
Expected performance improvements:
- Casual chat: 10.7s → 1.2s (89% faster)
- Plan request: 10.7s → 6.5s (40% faster)  
- Crisis: 10.7s → 5.5s (49% faster)
"""

import asyncio
import sys
import os
import time
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Set environment to development
os.environ.setdefault("ENVIRONMENT", "development")


async def test_tool_calling():
    """Test Aika's new tool-calling architecture."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.core.config import get_settings
    from app.agents.aika.orchestrator import AikaOrchestrator
    
    print("=" * 80)
    print("🧪 Testing Aika Tool-Calling Architecture")
    print("=" * 80)
    
    # Setup database
    settings = get_settings()
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        orchestrator = AikaOrchestrator(db)
        
        # Test scenarios
        test_cases = [
            {
                "name": "Casual Greeting (Fast Path - No Agents)",
                "message": "Halo Aika gimana kabarmu hari ini?",
                "expected_agents": [],
                "expected_time_ms": 1500,
            },
            {
                "name": "General Question (Fast Path - No Agents)",
                "message": "Apa itu stress? Bisa jelasin dikit?",
                "expected_agents": [],
                "expected_time_ms": 2000,
            },
            {
                "name": "Explicit Plan Request (SCA Only)",
                "message": "Buatin aku rencana untuk handle stress kuliah dong, aku butuh strategi konkret",
                "expected_agents": ["SCA"],
                "expected_time_ms": 7000,
            },
            {
                "name": "Plan Inquiry (DB Query - No Agents)",
                "message": "Rencana yang kamu buatin kemarin gimana ya? Aku lupa isinya",
                "expected_agents": [],
                "expected_time_ms": 2000,
            },
            {
                "name": "Crisis Message (STA + SDA)",
                "message": "Aku nggak kuat lagi, pengen bunuh diri aja rasanya",
                "expected_agents": ["STA"],  # SDA may also trigger
                "expected_time_ms": 6000,
            },
        ]
        
        results = []
        
        for idx, test in enumerate(test_cases, 1):
            print(f"\n{'─' * 80}")
            print(f"Test {idx}/{len(test_cases)}: {test['name']}")
            print(f"Message: \"{test['message'][:60]}...\"" if len(test['message']) > 60 else f"Message: \"{test['message']}\"")
            print(f"Expected: agents={test['expected_agents']}, time<{test['expected_time_ms']}ms")
            print(f"{'─' * 80}")
            
            start = time.time()
            
            try:
                result = await orchestrator.process_message_with_tools(
                    user_id=999,  # Test user
                    user_role="user",
                    message=test["message"],
                    session_id=f"test_session_{idx}",
                    conversation_history=[]
                )
                
                elapsed_ms = (time.time() - start) * 1000
                
                agents_used = result["metadata"]["agents_invoked"]
                response_text = result["response"][:200]
                success = result["success"]
                
                # Check if performance expectation met
                performance_met = elapsed_ms <= test["expected_time_ms"]
                
                # Check if expected agents invoked
                agents_correct = set(agents_used) >= set(test["expected_agents"])
                
                print(f"\n✅ SUCCESS" if success else f"\n❌ FAILED")
                print(f"⏱️  Time: {elapsed_ms:.0f}ms (expected <{test['expected_time_ms']}ms) {'✅' if performance_met else '⚠️ SLOW'}")
                print(f"🤖 Agents: {agents_used if agents_used else 'none'} (expected: {test['expected_agents'] if test['expected_agents'] else 'none'}) {'✅' if agents_correct else '⚠️'}")
                print(f"💬 Response: {response_text}{'...' if len(result['response']) > 200 else ''}")
                
                if result.get("intervention_plan"):
                    plan = result["intervention_plan"]
                    print(f"📋 Plan Created: ID={plan.get('id')}, Steps={plan.get('total_steps')}")
                
                if result["metadata"].get("risk_level") != "low":
                    print(f"🚨 Risk Level: {result['metadata']['risk_level']}")
                
                results.append({
                    "test": test["name"],
                    "success": success,
                    "time_ms": elapsed_ms,
                    "agents": agents_used,
                    "performance_met": performance_met,
                    "agents_correct": agents_correct,
                })
                
            except Exception as e:
                elapsed_ms = (time.time() - start) * 1000
                print(f"\n❌ EXCEPTION: {e}")
                print(f"⏱️  Time: {elapsed_ms:.0f}ms")
                
                results.append({
                    "test": test["name"],
                    "success": False,
                    "time_ms": elapsed_ms,
                    "error": str(e),
                })
        
        # Summary
        print(f"\n{'=' * 80}")
        print("📊 SUMMARY")
        print(f"{'=' * 80}")
        
        successful = sum(1 for r in results if r.get("success", False))
        avg_time = sum(r["time_ms"] for r in results) / len(results)
        fast_path = sum(1 for r in results if not r.get("agents"))
        
        print(f"Total Tests: {len(results)}")
        print(f"Passed: {successful}/{len(results)} ({successful/len(results)*100:.0f}%)")
        print(f"Average Response Time: {avg_time:.0f}ms")
        print(f"Fast Path (no agents): {fast_path}/{len(results)} ({fast_path/len(results)*100:.0f}%)")
        
        print(f"\n{'─' * 80}")
        print("Performance Breakdown:")
        print(f"{'─' * 80}")
        for r in results:
            status = "✅" if r.get("success") else "❌"
            agents_str = ', '.join(r.get("agents", [])) if r.get("agents") else "none"
            print(f"{status} {r['test'][:50]:<50} {r['time_ms']:>6.0f}ms  [{agents_str}]")
        
        print(f"\n{'=' * 80}")
        if successful == len(results) and avg_time < 4000:
            print("🎉 ALL TESTS PASSED - Tool-calling architecture working perfectly!")
            print(f"Average {avg_time:.0f}ms is {'MUCH' if avg_time < 3000 else ''} faster than old 10.7s baseline!")
        else:
            print("⚠️  Some tests failed or performance not optimal. Check logs above.")
        print(f"{'=' * 80}\n")


if __name__ == "__main__":
    try:
        asyncio.run(test_tool_calling())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

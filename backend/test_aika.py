#!/usr/bin/env python
"""
Test script for Aika Meta-Agent

This script tests the Aika orchestrator with various user roles and scenarios.
Run from backend directory: python test_aika.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.aika import AikaOrchestrator
from app.database import AsyncSessionLocal


async def test_student_conversation():
    """Test 1: Student having a normal conversation"""
    print("\n" + "="*80)
    print("TEST 1: Student Conversation (Low Risk)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        aika = AikaOrchestrator(db=db)
        
        result = await aika.process_message(
            user_id=1,
            user_role="user",
            message="Hai Aika, aku sedang merasa sedikit stress dengan tugas kuliah.",
            session_id="test_session_1",
            conversation_history=[],
        )
        
        print(f"\n[OK] Success: {result['success']}")
        print(f"📝 Response: {result['response'][:200]}...")
        print(f"\n📊 Metadata:")
        print(f"   - Agents: {result['metadata']['agents_invoked']}")
        print(f"   - Risk: {result['metadata']['risk_level']}")
        print(f"   - Time: {result['metadata']['processing_time_ms']:.2f}ms")
        print(f"   - Escalation: {result['metadata']['escalation_needed']}")


async def test_crisis_conversation():
    """Test 2: Student in crisis (should escalate)"""
    print("\n" + "="*80)
    print("TEST 2: Crisis Conversation (High Risk - Should Escalate)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        aika = AikaOrchestrator(db=db)
        
        result = await aika.process_message(
            user_id=2,
            user_role="user",
            message="Aku sudah tidak tahu harus berbuat apa lagi. Aku merasa tidak ada harapan dan ingin mengakhiri semua ini.",
            session_id="test_session_2",
            conversation_history=[],
        )
        
        print(f"\n[OK] Success: {result['success']}")
        print(f"🚨 Response: {result['response'][:300]}...")
        print(f"\n📊 Metadata:")
        print(f"   - Agents: {result['metadata']['agents_invoked']}")
        print(f"   - Risk: {result['metadata']['risk_level']}")
        print(f"   - Time: {result['metadata']['processing_time_ms']:.2f}ms")
        print(f"   - Escalation: {result['metadata']['escalation_needed']}")
        print(f"   - Actions: {result['metadata']['actions_taken']}")


async def test_admin_query():
    """Test 3: Admin asking for analytics"""
    print("\n" + "="*80)
    print("TEST 3: Admin Analytics Query")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        aika = AikaOrchestrator(db=db)
        
        result = await aika.process_message(
            user_id=100,
            user_role="admin",
            message="Kasih saya informasi tentang topik yang sering dibicarakan minggu ini",
            session_id="admin_session_1",
            conversation_history=[],
        )
        
        print(f"\n[OK] Success: {result['success']}")
        print(f"📊 Response: {result['response'][:300]}...")
        print(f"\n📊 Metadata:")
        print(f"   - Agents: {result['metadata']['agents_invoked']}")
        print(f"   - Intent: {result['metadata']['intent']}")
        print(f"   - Time: {result['metadata']['processing_time_ms']:.2f}ms")


async def test_counselor_cases():
    """Test 4: Counselor reviewing cases"""
    print("\n" + "="*80)
    print("TEST 4: Counselor Case Review")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        aika = AikaOrchestrator(db=db)
        
        result = await aika.process_message(
            user_id=200,
            user_role="counselor",
            message="Show me my active cases, prioritized by severity",
            session_id="counselor_session_1",
            conversation_history=[],
        )
        
        print(f"\n[OK] Success: {result['success']}")
        print(f"📋 Response: {result['response'][:300]}...")
        print(f"\n📊 Metadata:")
        print(f"   - Agents: {result['metadata']['agents_invoked']}")
        print(f"   - Intent: {result['metadata']['intent']}")
        print(f"   - Time: {result['metadata']['processing_time_ms']:.2f}ms")


async def test_error_handling():
    """Test 5: Error handling"""
    print("\n" + "="*80)
    print("TEST 5: Error Handling (Invalid User)")
    print("="*80)
    
    async with AsyncSessionLocal() as db:
        aika = AikaOrchestrator(db=db)
        
        try:
            result = await aika.process_message(
                user_id=99999,  # Non-existent user
                user_role="user",
                message="Hello",
                session_id="test_error",
                conversation_history=[],
            )
            
            print(f"\n[OK] Handled gracefully: {result['success']}")
            if not result['success']:
                print(f"[ERR] Error: {result.get('error')}")
            else:
                print(f"📝 Response: {result['response'][:200]}...")
                
        except Exception as e:
            print(f"[ERR] Exception raised (should be caught): {e}")


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("AIKA META-AGENT TEST SUITE")
    print("🌟"*40)
    
    try:
        # Test 1: Normal student conversation
        await test_student_conversation()
        await asyncio.sleep(1)
        
        # Test 2: Crisis conversation
        await test_crisis_conversation()
        await asyncio.sleep(1)
        
        # Test 3: Admin analytics
        await test_admin_query()
        await asyncio.sleep(1)
        
        # Test 4: Counselor cases
        await test_counselor_cases()
        await asyncio.sleep(1)
        
        # Test 5: Error handling
        await test_error_handling()
        
        print("\n" + "="*80)
        print("[OK] ALL TESTS COMPLETED")
        print("="*80)
        print("\n📝 Summary:")
        print("   - Test 1: Student conversation (low risk)")
        print("   - Test 2: Crisis conversation (high risk + escalation)")
        print("   - Test 3: Admin analytics query")
        print("   - Test 4: Counselor case review")
        print("   - Test 5: Error handling")
        print("\n💡 Next Steps:")
        print("   1. Review console output for any errors")
        print("   2. Check database for created cases (Test 2)")
        print("   3. Verify LLM responses are appropriate")
        print("   4. Test via API endpoint: POST /api/v1/aika")
        print()
        
    except KeyboardInterrupt:
        print("\n\n[WARN]  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n[ERR] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

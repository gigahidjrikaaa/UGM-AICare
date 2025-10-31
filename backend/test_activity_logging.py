"""
Test script for Aika Activity Logging

Run this to see agent activities in real-time.
"""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.agents.aika.orchestrator import AikaOrchestrator
from app.database import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession


async def test_activity_logging():
    """Test activity logging with a sample message"""
    
    print("=" * 80)
    print("AIKA ACTIVITY LOGGING TEST")
    print("=" * 80)
    
    # Get database session
    async for db in get_async_db():
        # Create orchestrator
        orchestrator = AikaOrchestrator(db)
        
        # Set up callback to print activities
        def print_activity(activity_data):
            event = activity_data.get("data", {})
            print(f"\n[{event['timestamp']}] {event['agent']} - {event['activity_type']}")
            print(f"  ⮑ {event['message']}")
            if event.get('details'):
                print(f"  Details: {event['details']}")
            if event.get('duration_ms'):
                print(f"  Duration: {event['duration_ms']:.2f}ms")
        
        orchestrator.set_activity_callback(print_activity)
        
        # Test message
        test_messages = [
            {
                "user_id": 1,
                "user_role": "user",
                "message": "I'm feeling really stressed about my exams",
            },
            {
                "user_id": 1,
                "user_role": "user",
                "message": "I feel hopeless and don't want to live anymore",
            },
        ]
        
        for i, test in enumerate(test_messages, 1):
            print(f"\n\n{'='*80}")
            print(f"TEST CASE {i}: {test['message']}")
            print(f"{'='*80}\n")
            
            result = await orchestrator.process_message(
                user_id=test["user_id"],
                user_role=test["user_role"],
                message=test["message"],
            )
            
            print(f"\n\n{'='*80}")
            print("FINAL RESULT:")
            print(f"{'='*80}")
            print(f"Response: {result['response']}")
            print(f"\nMetadata:")
            print(f"  - Agents invoked: {result['metadata']['agents_invoked']}")
            print(f"  - Risk level: {result['metadata']['risk_level']}")
            print(f"  - Processing time: {result['metadata']['processing_time_ms']:.2f}ms")
            print(f"  - Escalation needed: {result['metadata']['escalation_needed']}")
            
            print(f"\n\nActivity Log Summary:")
            print(f"  Total activities: {len(result['activity_logs'])}")
            
            # Wait before next test
            if i < len(test_messages):
                await asyncio.sleep(2)
        
        break


if __name__ == "__main__":
    asyncio.run(test_activity_logging())

#!/usr/bin/env python3
"""
Simple test for ActivityLogger class without dependencies
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Import directly from the file to avoid package __init__ dependencies
import importlib.util
spec = importlib.util.spec_from_file_location(
    "activity_logger",
    backend_dir / "app" / "agents" / "aika" / "activity_logger.py"
)
if spec and spec.loader:
    activity_logger_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(activity_logger_module)
    ActivityLogger = activity_logger_module.ActivityLogger
    ActivityType = activity_logger_module.ActivityType
else:
    raise ImportError("Could not load activity_logger module")

def print_activity(activity_data: dict):
    """Callback to print activities in real-time"""
    # Activity data format: {"type": "activity_log", "data": {...}}
    if "data" not in activity_data:
        print(f"Warning: Received malformed activity data: {activity_data}")
        return
        
    event = activity_data["data"]
    timestamp = event.get("timestamp", "N/A")
    event_type = event.get("activity_type", "unknown")  # Use activity_type from to_dict()
    agent = event.get("agent", "N/A")
    message = event.get("message", "")
    duration = event.get("duration_ms", "N/A")
    
    print(f"[{timestamp}] {event_type} | Agent: {agent} | {message} | Duration: {duration}ms")
    if event.get("details"):
        print(f"  Details: {event['details']}")
    print()

async def test_activity_logger():
    """Test the ActivityLogger class"""
    print("=" * 80)
    print("Testing ActivityLogger")
    print("=" * 80)
    print()
    
    # Create logger
    logger = ActivityLogger()
    logger.set_callback(print_activity)
    
    # Simulate agent workflow
    print("Simulating agent workflow...")
    print()
    
    # Start agent
    logger.log_agent_start("STA", "Starting risk assessment")
    await asyncio.sleep(0.1)
    
    # Node processing
    logger.log_node_start("STA", "triage_node")
    await asyncio.sleep(0.2)
    logger.log_node_complete("STA", "triage_node")
    
    # LLM call
    logger.log_llm_call("STA", "gemini-2.5-pro", "Assessing mental health risk")
    await asyncio.sleep(0.3)
    
    # Risk assessment
    logger.log_risk_assessment("moderate", 0.65, ["stress", "anxiety"])
    
    # Routing decision
    logger.log_routing_decision("STA", "coaching", "Moderate risk - coaching recommended")
    
    # Complete agent
    logger.log_agent_complete("STA", "Risk assessment completed")
    
    # Start coaching agent
    logger.log_agent_start("SCA", "Starting coaching intervention")
    await asyncio.sleep(0.1)
    
    # Create intervention
    logger.log_intervention_created(101, "stress-management")
    
    # Complete coaching
    logger.log_agent_complete("SCA", "Coaching plan created")
    
    # Get activity summary
    print()
    print("=" * 80)
    print("Activity Summary")
    print("=" * 80)
    activities = logger.get_activities()
    print(f"Total events: {len(activities)}")
    print(f"Agents involved: STA, SCA")
    print()
    
    # Test error handling
    print("Testing error handling...")
    print()
    logger.log_agent_error("SDA", "Database connection failed", Exception("Connection timeout"))
    
    print("=" * 80)
    print("Test Complete!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_activity_logger())

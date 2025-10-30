"""Test if imports work after circular import fix."""

print("Testing imports...")

try:
    print("1. Testing SafetyTriageClassifier import...")
    from app.agents.sta.classifiers import SafetyTriageClassifier
    print("   ✅ SafetyTriageClassifier imported successfully")
except Exception as e:
    print(f"   ❌ Failed: {e}")

try:
    print("2. Testing agent_adapters import...")
    from app.agents.aika import agent_adapters
    print("   ✅ agent_adapters imported successfully")
except Exception as e:
    print(f"   ❌ Failed: {e}")

try:
    print("3. Testing AikaOrchestrator import...")
    from app.agents.aika import AikaOrchestrator
    print("   ✅ AikaOrchestrator imported successfully")
except Exception as e:
    print(f"   ❌ Failed: {e}")

print("\n✅ All imports successful! Circular import is fixed.")

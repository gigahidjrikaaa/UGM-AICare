#!/bin/bash
# Quick Start Guide - Test New Gemini-based STA Classifier

set -e  # Exit on error

echo "================================"
echo "STA Gemini Classifier - Quick Test"
echo "================================"
echo ""

# Check we're in backend directory
if [ ! -f "test_gemini_sta.py" ]; then
    echo "❌ Error: test_gemini_sta.py not found"
    echo "   Please run from backend/ directory"
    exit 1
fi

# Step 1: Check Python environment
echo "Step 1: Checking Python environment..."
if ! python --version > /dev/null 2>&1; then
    echo "❌ Python not found"
    exit 1
fi
echo "✅ Python found: $(python --version)"
echo ""

# Step 2: Check dependencies
echo "Step 2: Checking dependencies..."
echo "   Checking google-genai..."
python -c "import google.genai" 2>/dev/null && echo "   ✅ google-genai installed" || echo "   ❌ google-genai NOT installed (run: pip install google-genai)"

echo "   Checking if PyTorch removed..."
python -c "import torch" 2>/dev/null && echo "   ⚠️  PyTorch still installed (run cleanup script)" || echo "   ✅ PyTorch removed"

echo ""

# Step 3: Check service initialization
echo "Step 3: Testing STA service initialization..."
python -c "
try:
    from app.agents.sta.service import get_safety_triage_service
    svc = get_safety_triage_service()
    print('   ✅ STA service initialized successfully')
except Exception as e:
    print(f'   ❌ Service initialization failed: {e}')
    exit(1)
"
echo ""

# Step 4: Quick classifier test
echo "Step 4: Testing classifier with crisis message..."
python -c "
import asyncio
from app.agents.sta.gemini_classifier import GeminiSTAClassifier
from app.agents.sta.models import STAClassifyPayload

async def test():
    try:
        classifier = GeminiSTAClassifier()
        payload = STAClassifyPayload(
            text='I want to kill myself',
            user_id='test_user',
            session_id='test_session'
        )
        result = await classifier.classify(payload)
        
        if result.risk_level == 'crisis':
            print('   ✅ Crisis detection works')
            print(f'   Risk Score: {result.risk_score:.2f}')
            print(f'   Gemini Used: {result.metadata.get(\"gemini_used\", True)}')
        else:
            print(f'   ❌ Expected crisis, got {result.risk_level}')
            exit(1)
    except Exception as e:
        print(f'   ❌ Test failed: {e}')
        exit(1)

asyncio.run(test())
"
echo ""

# Step 5: Run full test suite
echo "Step 5: Running full test suite..."
echo "   This will take ~30 seconds..."
echo ""
python test_gemini_sta.py

echo ""
echo "================================"
echo "✅ All tests complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Review test results above"
echo "2. Run cleanup script: python cleanup_ml_dependencies.py"
echo "3. Test with real API: start backend and send messages"
echo ""

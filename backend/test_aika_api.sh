#!/bin/bash
# Aika API Test Script
# Test the /api/v1/aika endpoint with various scenarios

BASE_URL="http://localhost:8000"
AIKA_ENDPOINT="$BASE_URL/api/v1/aika"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "========================================"
echo "🌟 AIKA API TEST SUITE"
echo "========================================"
echo ""

# Note: You need to replace YOUR_JWT_TOKEN with an actual token
# Get token via: POST /api/auth/login
JWT_TOKEN="${JWT_TOKEN:-YOUR_JWT_TOKEN_HERE}"

if [ "$JWT_TOKEN" = "YOUR_JWT_TOKEN_HERE" ]; then
    echo "${YELLOW}⚠️  Warning: JWT_TOKEN not set${NC}"
    echo "   Export JWT_TOKEN environment variable first:"
    echo "   export JWT_TOKEN=\$(curl -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"user@example.com\",\"password\":\"password\"}' | jq -r '.access_token')"
    echo ""
    echo "   Or run this script with: JWT_TOKEN=your_token ./test_aika_api.sh"
    echo ""
    exit 1
fi

echo "Using JWT Token: ${JWT_TOKEN:0:20}..."
echo ""

# Test 1: Student Conversation (Low Risk)
echo "========================================"
echo "TEST 1: Student Conversation (Low Risk)"
echo "========================================"
curl -X POST "$AIKA_ENDPOINT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hai Aika, aku sedang merasa sedikit stress dengan tugas kuliah.",
    "session_id": "api_test_1"
  }' | jq '.'

echo ""
echo ""
sleep 2

# Test 2: Crisis Conversation (High Risk)
echo "========================================"
echo "TEST 2: Crisis Conversation (High Risk)"
echo "========================================"
curl -X POST "$AIKA_ENDPOINT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Aku merasa tidak ada harapan lagi dan ingin mengakhiri semua ini.",
    "session_id": "api_test_2"
  }' | jq '.'

echo ""
echo ""
sleep 2

# Test 3: Conversation with History
echo "========================================"
echo "TEST 3: Conversation with History"
echo "========================================"
curl -X POST "$AIKA_ENDPOINT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Terima kasih sudah mendengarkan aku.",
    "session_id": "api_test_3",
    "history": [
      {"role": "user", "content": "Aku sedang stress"},
      {"role": "assistant", "content": "Aku mengerti kamu sedang merasa tertekan..."}
    ]
  }' | jq '.'

echo ""
echo ""

# Test 4: Admin Query (if you have admin token)
echo "========================================"
echo "TEST 4: Admin Query (Optional)"
echo "========================================"
echo "Note: This requires an admin user token"
echo "Skipping for now..."
echo ""

# Test 5: Error Handling (Invalid JSON)
echo "========================================"
echo "TEST 5: Error Handling"
echo "========================================"
curl -X POST "$AIKA_ENDPOINT" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "api_test_5"
  }' | jq '.'

echo ""
echo ""

echo "========================================"
echo "✅ API TESTS COMPLETED"
echo "========================================"
echo ""
echo "📝 Check the responses above for:"
echo "   - success: true/false"
echo "   - response: Aika's message"
echo "   - metadata.agents_invoked: Which agents ran"
echo "   - metadata.risk_level: Risk assessment"
echo "   - metadata.escalation_needed: Crisis flag"
echo ""
echo "💡 Next Steps:"
echo "   1. Check application logs for detailed execution"
echo "   2. Verify database for created cases (Test 2)"
echo "   3. Test with frontend chat interface"
echo ""

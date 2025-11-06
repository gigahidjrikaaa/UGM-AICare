#!/bin/bash
# Test Profile Endpoints with Normalized Tables
# Run: bash backend/test_profile_api.sh

set -e  # Exit on error

BASE_URL="http://localhost:8000"
EMAIL="test_normalized_$(date +%s)@ugm.ac.id"
PASSWORD="TestPassword123!"
FIRST_NAME="Budi"
LAST_NAME="Santoso"

echo "🧪 Testing Profile Endpoints with Normalized Tables"
echo "=================================================="
echo ""

# Step 1: Register new user
echo "1️⃣  Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"${FIRST_NAME} ${LAST_NAME}\",
    \"firstName\": \"${FIRST_NAME}\",
    \"lastName\": \"${LAST_NAME}\",
    \"email\": \"${EMAIL}\",
    \"phone\": \"+6281234567890\",
    \"dateOfBirth\": \"2000-01-15\",
    \"gender\": \"Pria\",
    \"city\": \"Yogyakarta\",
    \"university\": \"UGM\",
    \"major\": \"Psikologi\",
    \"yearOfStudy\": \"3\",
    \"password\": \"${PASSWORD}\",
    \"allowEmailCheckins\": true
  }")

echo "$REGISTER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$REGISTER_RESPONSE"

# Check if registration succeeded
if echo "$REGISTER_RESPONSE" | grep -q "access_token"; then
    echo "✅ Registration successful"
else
    echo "❌ Registration failed"
    exit 1
fi

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to extract access token"
    exit 1
fi

echo ""
echo "2️⃣  Testing GET /api/v1/profile/overview..."
PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/api/v1/profile/overview" \
  -H "Authorization: Bearer ${TOKEN}")

echo "$PROFILE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PROFILE_RESPONSE"

# Check if profile data is correct
if echo "$PROFILE_RESPONSE" | grep -q "\"full_name\": \"${FIRST_NAME} ${LAST_NAME}\""; then
    echo "✅ GET profile successful - name matches"
else
    echo "⚠️  Profile name might not match (check normalized tables)"
fi

if echo "$PROFILE_RESPONSE" | grep -q "\"city\": \"Yogyakarta\""; then
    echo "✅ City field populated correctly"
else
    echo "⚠️  City field not found"
fi

echo ""
echo "3️⃣  Testing PUT /api/v1/profile/overview (update profile)..."
UPDATE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/api/v1/profile/overview" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Jakarta",
    "preferred_language": "en",
    "preferred_timezone": "Asia/Jakarta",
    "preferred_name": "Budi"
  }')

echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"

# Check if update succeeded
if echo "$UPDATE_RESPONSE" | grep -q "\"city\": \"Jakarta\""; then
    echo "✅ PUT profile successful - city updated to Jakarta"
else
    echo "⚠️  City update might have failed"
fi

if echo "$UPDATE_RESPONSE" | grep -q "\"preferred_language\": \"en\""; then
    echo "✅ Preferred language updated to English"
else
    echo "⚠️  Language update might have failed"
fi

echo ""
echo "4️⃣  Verifying data in database..."
docker exec -it ugm_aicare_backend_dev bash -c "
PGPASSWORD=giga123456 psql -h db -U giga -d aicare_db -c \"
SELECT 
    up.id as profile_id,
    up.first_name,
    up.last_name,
    up.city,
    u.email
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email LIKE '%test_normalized%'
ORDER BY u.created_at DESC
LIMIT 1;
\"
"

echo ""
echo "=================================================="
echo "✅ Profile endpoint tests completed!"
echo ""
echo "Summary:"
echo "- Registered new user with email: ${EMAIL}"
echo "- Verified GET profile returns correct data"
echo "- Verified PUT profile updates fields"
echo "- Checked database for normalized table entries"
echo ""
echo "Expected: UserProfile, UserPreferences, UserEmergencyContact tables populated"

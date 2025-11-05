#!/bin/bash

# Test script to verify all three Aika bug fixes
# Fix 1: STA async bug (apply_redaction_node)
# Fix 2: SCA attribute error (resources → resource_cards)
# Fix 3: SCA database constraint (total_steps NOT NULL)

echo "=========================================="
echo "Testing Aika Bug Fixes"
echo "=========================================="
echo ""

# Test 1: Basic greeting to trigger emotional support flow
echo "Test 1: Basic Greeting (Emotional Support Intent)"
echo "--------------------------------------------------"
curl -X POST http://localhost:8000/api/v1/aika \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Halo Aika, aku lagi stress banget karena tugas akhir",
    "user_id": "test_user_fixes_1"
  }' | jq '.'

echo ""
echo ""

# Test 2: More complex message to test full STA + SCA flow
echo "Test 2: Stress with Context (Full STA + SCA Flow)"
echo "--------------------------------------------------"
curl -X POST http://localhost:8000/api/v1/aika \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Aku ngerasa overwhelmed, banyak deadline dan aku gak tau harus mulai dari mana",
    "user_id": "test_user_fixes_2"
  }' | jq '.'

echo ""
echo ""

# Check backend logs for errors
echo "=========================================="
echo "Checking Backend Logs for Errors"
echo "=========================================="
docker logs ugm_aicare_backend_dev --tail 100 | grep -i -E "error|traceback|exception|invalid|null value|coroutine" || echo "✅ No critical errors found in logs"

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
echo ""
echo "Expected Results:"
echo "✅ Test 1: Should return intervention plan with ID"
echo "✅ Test 2: Should return personalized support response"
echo "✅ No 'Expected dict, got coroutine' errors"
echo "✅ No 'attribute resources' errors"
echo "✅ No 'total_steps violates not-null' errors"

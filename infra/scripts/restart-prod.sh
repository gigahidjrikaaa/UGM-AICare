#!/bin/bash
# Quick fix script for updating production environment variables
# Run this on your VM after updating .env file

set -e

echo "========================================="
echo "Restarting UGM-AICare Production Stack"
echo "========================================="

# 1. Check current NEXTAUTH_URL in running container
echo ""
echo "1. Current NEXTAUTH_URL in frontend container:"
docker exec ugm_aicare_frontend env | grep NEXTAUTH_URL || echo "   (not set)"

# 2. Check .env file
echo ""
echo "2. NEXTAUTH_URL in .env file:"
grep "^NEXTAUTH_URL=" .env || echo "   (not found in .env)"

# 3. Stop containers
echo ""
echo "3. Stopping containers..."
docker compose -f infra/compose/docker-compose.prod.yml down

# 4. Restart with new environment
echo ""
echo "4. Starting containers with updated .env..."
docker compose -f infra/compose/docker-compose.prod.yml up -d

# 5. Wait for frontend to be ready
echo ""
echo "5. Waiting for frontend to start..."
sleep 10

# 6. Verify new environment variables
echo ""
echo "6. Verifying new NEXTAUTH_URL:"
docker exec ugm_aicare_frontend env | grep NEXTAUTH_URL || echo "   ERROR: Still not set!"

echo ""
echo "7. Checking frontend logs:"
docker logs ugm_aicare_frontend --tail 20

echo ""
echo "========================================="
echo "✅ Restart complete!"
echo "========================================="
echo ""
echo "Test the fix:"
echo "1. Open: https://aicare.sumbu.xyz/signin"
echo "2. Click 'Sign in with Google'"
echo "3. Should redirect to aicare.sumbu.xyz (NOT localhost!)"
echo ""

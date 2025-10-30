#!/bin/bash

# Aika Enhanced Chat - Integration Testing Script
# This script starts both backend and frontend servers and provides testing instructions

set -e

echo "================================================"
echo "  Aika Enhanced Chat - Integration Testing"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking environment setup...${NC}"
echo ""

# Check backend virtual environment
if [ ! -d "backend/.venv" ]; then
    echo -e "${RED}Backend virtual environment not found!${NC}"
    echo "Creating virtual environment..."
    cd backend
    python -m venv .venv
    source .venv/bin/activate  # or .venv/Scripts/activate on Windows
    pip install -r requirements.txt
    cd ..
fi

# Check frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not installed!${NC}"
    echo "Installing dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✓ Environment setup complete${NC}"
echo ""

echo -e "${BLUE}Step 2: Starting Backend Server...${NC}"
echo ""

# Start backend in background
cd backend
source .venv/bin/activate  # or .venv/Scripts/activate on Windows
echo "Starting FastAPI server on http://localhost:8000"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running (PID: $BACKEND_PID)${NC}"
else
    echo -e "${YELLOW}⚠ Backend health check failed, but continuing...${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Starting Frontend Server...${NC}"
echo ""

# Start frontend in background
cd frontend
echo "Starting Next.js dev server on http://localhost:4000"
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "Waiting for frontend to start..."
sleep 10

echo ""
echo -e "${GREEN}✓ Servers started successfully!${NC}"
echo ""

echo "================================================"
echo "  🧪 TESTING INSTRUCTIONS"
echo "================================================"
echo ""

echo -e "${BLUE}Access Points:${NC}"
echo "  Frontend:  http://localhost:4000"
echo "  Enhanced:  http://localhost:4000/aika-enhanced"
echo "  Backend:   http://localhost:8000/docs"
echo ""

echo -e "${BLUE}Test Scenarios:${NC}"
echo ""

echo -e "${YELLOW}1. Low-Risk Conversation (Agent Activity Only)${NC}"
echo "   User Message: \"Hi Aika, how are you today?\""
echo "   Expected Results:"
echo "     ✓ Friendly greeting response"
echo "     ✓ Agent activity badge appears (STA + SCA)"
echo "     ✓ NO risk indicator"
echo "     ✓ NO escalation notification"
echo "     ✓ Processing time shown (<500ms typical)"
echo ""

echo -e "${YELLOW}2. Medium-Risk Stress Expression (Risk Detection)${NC}"
echo "   User Message: \"I'm feeling really stressed about my exams and I can't sleep\""
echo "   Expected Results:"
echo "     ✓ Supportive, empathetic response"
echo "     ✓ Agent activity badge (STA + SCA consulted)"
echo "     ✓ YELLOW risk indicator appears"
echo "     ✓ Risk factors listed (stress, sleep issues)"
echo "     ✓ NO escalation (not critical yet)"
echo "     ✓ Possible intervention plan suggested"
echo ""

echo -e "${YELLOW}3. High-Risk Crisis Language (Escalation)${NC}"
echo "   User Message: \"I don't think I can handle this anymore, everything feels hopeless\""
echo "   Expected Results:"
echo "     ✓ Crisis intervention response"
echo "     ✓ Agent activity badge (STA + SCA + SDA consulted)"
echo "     ✓ RED/ORANGE risk indicator"
echo "     ✓ Risk factors: hopelessness, crisis language"
echo "     ✓ TEAL escalation notification with case ID"
echo "     ✓ Emergency resources provided"
echo "     ✓ Case created in database (check /counselor/dashboard)"
echo ""

echo -e "${YELLOW}4. UI Feature Checks${NC}"
echo "   Test these interactions:"
echo "     □ Click metadata toggle (Info button) - shows technical details"
echo "     □ Click plans button - opens intervention plans sidebar"
echo "     □ Test keyboard shortcuts (Enter to send, Shift+Enter for newline)"
echo "     □ Verify sound effects play on message arrival"
echo "     □ Check markdown rendering (try **bold** or *italic*)"
echo "     □ Verify avatars display correctly (Aika image, user badge)"
echo "     □ Test on mobile view (resize browser < 768px)"
echo "     □ Check loading animation while waiting for response"
echo ""

echo -e "${YELLOW}5. Performance Checks${NC}"
echo "   Monitor these metrics:"
echo "     □ Page load time < 2 seconds"
echo "     □ Message send/receive < 2 seconds (typical)"
echo "     □ Smooth animations (60fps)"
echo "     □ No console errors in browser DevTools"
echo "     □ No memory leaks (check DevTools Memory tab)"
echo ""

echo -e "${BLUE}Browser DevTools Checklist:${NC}"
echo "  1. Open DevTools (F12)"
echo "  2. Check Console tab - should have no red errors"
echo "  3. Check Network tab - verify API calls to /api/mental-health/aika"
echo "  4. Check Application tab - verify session storage"
echo ""

echo -e "${BLUE}Backend Logs:${NC}"
echo "  Monitor the backend terminal for:"
echo "    🤖 Agent activity logs"
echo "    ⚠️ Risk detection warnings"
echo "    🚑 Case escalation logs"
echo "    ✅ Successful orchestration logs"
echo ""

echo -e "${RED}To Stop Servers:${NC}"
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Run: kill $BACKEND_PID $FRONTEND_PID"
echo "  Or press Ctrl+C to stop this script"
echo ""

echo "================================================"
echo "  Press Ctrl+C to stop all servers"
echo "================================================"
echo ""

# Wait for user to stop
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped'; exit 0" INT TERM

# Keep script running
wait

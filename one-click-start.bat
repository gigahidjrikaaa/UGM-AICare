@echo off
:: UGM-AICare Auto-Start Script
:: Starts both backend and frontend servers with Redis check

echo ===================================
echo    UGM-AICare Development Server
echo ===================================

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python and try again.
    exit /b 1
)

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    exit /b 1
)

:: Check if Redis is running
echo Checking if Redis server is running...
redis-cli ping > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Redis is not running. Please start Redis server before running this script.
    echo You can start Redis by running: redis-server
    exit /b 1
)
echo Redis server is running! Connection successful.

:: Create logs directory if it doesn't exist
if not exist "d:\Ngoding Moment\Github\UGM-AICare\backend\logs" (
    mkdir "d:\Ngoding Moment\Github\UGM-AICare\backend\logs"
)

:: Start the backend server in one terminal
echo Starting FastAPI backend server...
start cmd /k "cd /d d:\Ngoding Moment\Github\UGM-AICare\backend && echo Activating virtual environment... && call venv\Scripts\activate && echo Installing dependencies... && pip install -r requirements.txt && echo Starting FastAPI server... && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

:: Start the frontend server in another terminal
echo Starting Next.js frontend server...
start cmd /k "cd /d d:\Ngoding Moment\Github\UGM-AICare\frontend && echo Installing dependencies... && npm install && echo Starting Next.js dev server... && npm run dev"

:: Wait a moment for services to start
timeout /t 2 /nobreak > nul

:: Open browser windows for both services
echo Opening browser tabs...
start http://localhost:8000/docs
start http://localhost:3000

echo ===================================
echo Both servers are now starting!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - API Docs: http://localhost:8000/docs
echo ===================================
echo To stop the servers, close the terminal windows.
echo ===================================

exit /b 0
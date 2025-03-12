@echo off
:: UGM-AICare Auto-Start Script
:: Starts both backend and frontend servers with Redis check

echo ===================================
echo    UGM-AICare Development Server
echo ===================================

:: Change to the script's directory
cd /d "%~dp0"

:: Check if Windows Terminal is installed
where wt >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Windows Terminal is not installed.
    echo Please install Windows Terminal from the Microsoft Store and try again.
    echo Falling back to separate command prompt windows...
    goto :fallback_terminal
)

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python and try again.
    timeout /t 5 /nobreak > nul
    exit /b 1
)

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js and try again.
    timeout /t 5 /nobreak > nul
    exit /b 1
)

:: Check if Redis is running in WSL2 Ubuntu
echo Checking if Redis server is running in WSL2...
wsl -d Ubuntu -e redis-cli ping > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Redis is not running in WSL2 Ubuntu. Please start Redis server before running this script.
    echo You can start Redis by running: wsl -d Ubuntu -e redis-server
    timeout /t 5 /nobreak > nul
    exit /b 1
)
echo Redis server is running in WSL2! Connection successful.

:: Create logs directory if it doesn't exist
if not exist "%~dp0backend\logs" (
    mkdir "%~dp0backend\logs"
    echo. > "%~dp0backend\logs\chat.log"
)

:: Open browser windows for both services
echo Opening browser tabs...
start http://localhost:8000/docs
start http://localhost:3000

:: Start both servers in Windows Terminal tabs
echo Starting servers in Windows Terminal...
wt --title "UGM-AICare Dev" ^
   new-tab --title "Backend" --tabColor "#0078D4" cmd /k "cd /d %~dp0backend && echo Activating virtual environment... && call .venv\Scripts\activate && echo Installing dependencies... && pip install -r requirements.txt && echo Starting FastAPI server... && uvicorn app.main:app --reload --port 8000" ^
   new-tab --title "Frontend" --tabColor "#F7DF1E" cmd /k "cd /d %~dp0frontend && echo Installing dependencies... && npm install && echo Starting Next.js dev server... && npm run dev" ^
   new-tab --title "Redis Monitor" --tabColor "#A41E11" wsl -d Ubuntu -e bash -c "redis-cli monitor"

echo ===================================
echo Both servers are now starting in Windows Terminal!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - API Docs: http://localhost:8000/docs
echo ===================================
echo The services are running in Windows Terminal. To stop the servers, close the terminal window.
echo ===================================
exit /b 0

:fallback_terminal
:: Use this if Windows Terminal is not available

:: Start the backend server in one terminal
echo Starting FastAPI backend server...
start cmd /k "cd /d %~dp0backend && echo Activating virtual environment... && call .venv\Scripts\activate && echo Installing dependencies... && pip install -r requirements.txt && echo Starting FastAPI server... && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

:: Start the frontend server in another terminal
echo Starting Next.js frontend server...
start cmd /k "cd /d %~dp0frontend && echo Installing dependencies... && npm install && echo Starting Next.js dev server... && npm run dev"

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

:: Keep the script running
pause > nul
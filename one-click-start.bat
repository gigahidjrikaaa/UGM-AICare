@echo off
:: UGM-AICare Auto-Start Script
:: Starts both backend and frontend servers with Redis check

echo ===================================
echo    UGM-AICare Development Server
echo ===================================

:: Change to the script's directory
cd /d "%~dp0"

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

:: Ask the user for Redis connection preference
echo Choose Redis connection mode:
echo 1: Online Redis (check REDIS_URL in .env)
echo 2: Local Redis in WSL2 Ubuntu
choice /c 12 /n /m "Enter your choice (1 or 2): "

if %ERRORLEVEL% equ 1 (
    echo You selected Online Redis.
    
    :: Check if .env file exists
    if not exist "%~dp0backend\.env" (
        echo Creating .env file with default settings...
        echo REDIS_URL=your_redis_connection_string> "%~dp0backend\.env"
        echo Created .env file. Please edit it to set your REDIS_URL.
        notepad "%~dp0backend\.env"
        echo Press any key when you have updated the .env file...
        pause > nul
    )
    
    :: Check for REDIS_URL in the .env file
    echo Checking for REDIS_URL in .env file...
    type "%~dp0backend\.env" | findstr /i "REDIS_URL" > nul
    if %ERRORLEVEL% neq 0 (
        echo REDIS_URL not found in .env file.
        echo Adding REDIS_URL to your .env file...
        echo Press any key when REDIS_URL is in the .env file...
        pause > nul
    ) else (
        echo Found REDIS_URL in .env file.
    )
) else (
    echo You selected Local Redis in WSL2 Ubuntu.
    
    :: Check if Redis is running in WSL2 Ubuntu
    echo Checking if Redis server is running in WSL2...
    wsl -d Ubuntu -e redis-cli ping > nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo Redis is not running in WSL2 Ubuntu. Starting Redis server automatically...
        
        :: Start Redis in a separate window
        start "Redis Server" wsl -d Ubuntu -e redis-server
        
        :: Wait for Redis to start
        echo Waiting for Redis to initialize...
        timeout /t 3 /nobreak > nul
        
        :: Verify Redis is now running
        wsl -d Ubuntu -e redis-cli ping > nul 2>&1
        if %ERRORLEVEL% neq 0 (
            echo Failed to start Redis server. Please start it manually.
            timeout /t 5 /nobreak > nul
            exit /b 1
        )
    )
    echo Redis server is running in WSL2! Connection successful.
)

:: Create logs directory if it doesn't exist
if not exist "%~dp0backend\logs" (
    mkdir "%~dp0backend\logs"
    echo. > "%~dp0backend\logs\chat.log"
)

:: Start the backend server in one terminal
echo Starting FastAPI backend server...
start "UGM-AICare Backend" cmd /k "cd /d "%~dp0backend" && echo Activating virtual environment... && call .venv\Scripts\activate && echo Installing dependencies... && pip install -r requirements.txt && echo Starting FastAPI server... && uvicorn app.main:app --reload --port 8000 && pause"

:: Wait a moment for backend to initialize
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

:: Start the frontend server in another terminal
echo Starting Next.js frontend server...
start "UGM-AICare Frontend" cmd /k "cd /d "%~dp0frontend" && echo Installing dependencies... && npm install && echo Starting Next.js dev server... && npm run dev && pause"

:: Wait a moment for services to start
timeout /t 2 /nobreak > nul

:: Open browser windows for both services
echo Opening browser tabs...
start http://localhost:3000

echo ===================================
echo All services are now starting!
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo - API Docs: http://localhost:8000/docs
echo - Redis Monitor: See separate window
echo ===================================
echo To stop the servers, close the terminal windows.
echo ===================================

pause
exit /b 0
@echo off
setlocal enabledelayedexpansion

REM filepath: d:\Ngoding Moment\Github\UGM-AICare\one-click-start.bat
:: UGM-AICare Auto-Start Script
:: Enhanced version with better error handling and visual feedback

title UGM-AICare Development Environment

:: ANSI color codes for Windows 10+
set "RESET=[0m"
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"

:: Change to the script's directory
cd /d "%~dp0"

echo !CYAN!===================================!RESET!
echo !MAGENTA!    UGM-AICare Development Server    !RESET!
echo !CYAN!===================================!RESET!
echo.

:: Function to check prerequisites
call :check_prerequisites
if %ERRORLEVEL% neq 0 (
    echo !RED!Prerequisites check failed. Please fix the issues before continuing.!RESET!
    goto :cleanup_and_exit
)

:: Function to setup environments
call :setup_environments
if %ERRORLEVEL% neq 0 (
    echo !RED!Environment setup failed. Please check the logs.!RESET!
    goto :cleanup_and_exit
)

:: Function to start services
call :start_services

echo !GREEN!All services started successfully!!RESET!
echo !YELLOW!Press Ctrl+C in this window to gracefully shut down all services.!RESET!

:: Wait for user to press Ctrl+C
powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('UGM-AICare services are running. Click OK to shut down all services.', 'UGM-AICare', 'OK', [System.Windows.Forms.MessageBoxIcon]::Information)" > nul

call :cleanup_and_exit
goto :eof

:check_prerequisites
echo !CYAN!Checking prerequisites...!RESET!

:: Check if Python is available
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: Python is not installed or not in PATH.!RESET!
    echo !YELLOW!Please install Python 3.10+ and try again.!RESET!
    exit /b 1
)

:: Check Python version
python --version | findstr /R "3\.[1-9][0-9]\." >nul
if %ERRORLEVEL% neq 0 (
    echo !YELLOW!Warning: Your Python version may not be compatible (3.10+ recommended).!RESET!
    choice /c YN /n /m "Continue anyway? (Y/N): "
    if !ERRORLEVEL! equ 2 exit /b 1
)

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: Node.js is not installed or not in PATH.!RESET!
    echo !YELLOW!Please install Node.js 18+ and try again.!RESET!
    exit /b 1
)

:: Check if WSL is available
where wsl >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: Windows Subsystem for Linux (WSL) is not installed.!RESET!
    echo !YELLOW!Please install WSL and Ubuntu distribution.!RESET!
    exit /b 1
)

:: Check if Ubuntu is installed in WSL
wsl -l | findstr Ubuntu >nul
if %ERRORLEVEL% neq 0 (
    echo !RED!Error: Ubuntu not found in WSL.!RESET!
    echo !YELLOW!Please install Ubuntu distribution for WSL.!RESET!
    exit /b 1
)

:: Check if Redis is installed in WSL Ubuntu
wsl -d Ubuntu -e which redis-server >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo !YELLOW!Redis not found in WSL Ubuntu. Would you like to install it now?!RESET!
    choice /c YN /n /m "Install Redis in WSL Ubuntu? (Y/N): "
    if !ERRORLEVEL! equ 1 (
        echo !CYAN!Installing Redis in WSL Ubuntu...!RESET!
        wsl -d Ubuntu -e sudo apt-get update
        wsl -d Ubuntu -e sudo apt-get install -y redis-server
        wsl -d Ubuntu -e sudo systemctl enable redis-server
        if %ERRORLEVEL% neq 0 (
            echo !RED!Failed to install Redis in WSL Ubuntu.!RESET!
            exit /b 1
        )
        echo !GREEN!Redis installed successfully in WSL Ubuntu.!RESET!
    ) else (
        echo !RED!Redis is required for the application to function.!RESET!
        exit /b 1
    )
)

echo !GREEN!All prerequisites are met!!RESET!
echo.
exit /b 0

:setup_environments
echo !CYAN!Setting up environments...!RESET!

:: Backend environment setup
if not exist "%~dp0backend\.venv" (
    echo !YELLOW!Backend virtual environment not found. Creating...!RESET!
    cd /d "%~dp0backend"
    python -m venv .venv
    if %ERRORLEVEL% neq 0 (
        echo !RED!Failed to create virtual environment.!RESET!
        exit /b 1
    )
    
    echo !CYAN!Installing backend dependencies...!RESET!
    call .venv\Scripts\activate
    pip install -r requirements.txt
    if %ERRORLEVEL% neq 0 (
        echo !RED!Failed to install backend dependencies.!RESET!
        exit /b 1
    )
    call deactivate
)

:: Frontend environment setup
if not exist "%~dp0frontend\node_modules" (
    echo !YELLOW!Frontend dependencies not found. Installing...!RESET!
    cd /d "%~dp0frontend"
    npm install
    if %ERRORLEVEL% neq 0 (
        echo !RED!Failed to install frontend dependencies.!RESET!
        exit /b 1
    )
)

:: Check for .env files
if not exist "%~dp0backend\.env" (
    echo !YELLOW!Backend .env file not found. Creating a template...!RESET!
    echo # Redis Configuration > "%~dp0backend\.env"
    echo REDIS_HOST=127.0.0.1 >> "%~dp0backend\.env"
    echo REDIS_PORT=6379 >> "%~dp0backend\.env"
    echo REDIS_DB=0 >> "%~dp0backend\.env"
    echo REDIS_PASSWORD= >> "%~dp0backend\.env"
    echo. >> "%~dp0backend\.env"
    echo # API Configuration >> "%~dp0backend\.env"
    echo API_KEY=development_key >> "%~dp0backend\.env"
    echo INTERNAL_API_KEY=development_internal_key >> "%~dp0backend\.env"
    
    echo !CYAN!Backend .env file created. Please update it with your settings.!RESET!
    notepad "%~dp0backend\.env"
    echo !YELLOW!Press any key when you've finished updating the .env file...!RESET!
    pause > nul
)

if not exist "%~dp0frontend\.env.local" (
    echo !YELLOW!Frontend .env.local file not found. Creating a template...!RESET!
    echo # Environment Configuration > "%~dp0frontend\.env.local"
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 >> "%~dp0frontend\.env.local"
    echo NEXTAUTH_URL=http://localhost:4000 >> "%~dp0frontend\.env.local"
    echo NEXTAUTH_SECRET=your-nextauth-secret-key >> "%~dp0frontend\.env.local"
    echo. >> "%~dp0frontend\.env.local"
    echo # OAuth Configuration >> "%~dp0frontend\.env.local"
    echo GOOGLE_CLIENT_ID= >> "%~dp0frontend\.env.local"
    echo GOOGLE_CLIENT_SECRET= >> "%~dp0frontend\.env.local"
    
    echo !CYAN!Frontend .env.local file created. Please update it with your settings.!RESET!
    notepad "%~dp0frontend\.env.local"
    echo !YELLOW!Press any key when you've finished updating the .env.local file...!RESET!
    pause > nul
)

:: Create logs directory if it doesn't exist
if not exist "%~dp0backend\logs" (
    mkdir "%~dp0backend\logs"
    echo. > "%~dp0backend\logs\chat.log"
)

echo !GREEN!Environments set up successfully!!RESET!
echo.
exit /b 0

:start_services
echo !CYAN!Starting services...!RESET!

:: Store process IDs to terminate them later
set "PID_FILE=%TEMP%\ugm_aicare_pids.txt"
if exist "%PID_FILE%" del "%PID_FILE%"

:: Check and start Redis in WSL
echo !CYAN!Starting Redis server in WSL Ubuntu...!RESET!
wsl -d Ubuntu -e redis-cli ping >nul 2>&1
if %ERRORLEVEL% neq 0 (
    :: Redis is not running, start it
    start /min "Redis Server" cmd /c "wsl -d Ubuntu -e redis-server --daemonize yes && echo Redis started successfully! & pause"
    timeout /t 3 /nobreak > nul
    
    :: Verify Redis is now running
    wsl -d Ubuntu -e redis-cli ping >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo !RED!Failed to start Redis server. Please check your WSL Ubuntu installation.!RESET!
        exit /b 1
    )
)
echo !GREEN!Redis server is running!!RESET!

:: Start backend server
echo !CYAN!Starting backend server...!RESET!
start "Backend Server" cmd /c "cd /d "%~dp0backend" && call .venv\Scripts\activate && echo !GREEN!Backend server starting on http://localhost:8000!RESET! && uvicorn app.main:app --reload --port 8000 & echo !RED!Backend server stopped.!RESET! & pause"
timeout /t 2 /nobreak > nul

:: Start frontend server
echo !CYAN!Starting frontend server...!RESET!
start "Frontend Server" cmd /c "cd /d "%~dp0frontend" && echo !GREEN!Frontend server starting on http://localhost:4000!RESET! && npm run dev & echo !RED!Frontend server stopped.!RESET! & pause"
timeout /t 2 /nobreak > nul

:: Open the application in the default browser
echo !CYAN!Opening application in browser...!RESET!
timeout /t 5 /nobreak > nul
start http://localhost:4000

echo !GREEN!All services started!!RESET!
echo.
exit /b 0

:cleanup_and_exit
echo.
echo !YELLOW!Shutting down services...!RESET!

:: Stop Redis
echo !CYAN!Stopping Redis server...!RESET!
wsl -d Ubuntu -e redis-cli shutdown 2>nul

:: Closing started windows will automatically terminate the backend and frontend processes
echo !GREEN!All services stopped.!RESET!
echo !CYAN!Thank you for using UGM-AICare Development Environment.!RESET!
timeout /t 3 /nobreak > nul
exit /b 0
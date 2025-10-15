@echo off
REM Development helper script for UGM-AICare (Windows)

setlocal enabledelayedexpansion

set OVERRIDE_FILE=docker-compose.override.yml
set BACKUP_FILE=docker-compose.override.yml.disabled

if "%1"=="" goto :help
if "%1"=="help" goto :help
if "%1"=="--help" goto :help
if "%1"=="-h" goto :help

if "%1"=="up" goto :up
if "%1"=="down" goto :down
if "%1"=="restart" goto :restart
if "%1"=="logs" goto :logs
if "%1"=="build" goto :build
if "%1"=="prod" goto :prod
if "%1"=="dev" goto :dev
if "%1"=="clean" goto :clean
if "%1"=="status" goto :status

echo Unknown command: %1
echo.
goto :help

:help
echo UGM-AICare Docker Development Helper
echo.
echo Usage: dev.bat [command]
echo.
echo Commands:
echo   up              Start in development mode (hot-reload enabled)
echo   down            Stop all services
echo   restart         Restart all services
echo   logs [service]  View logs (optionally for specific service)
echo   build           Rebuild containers (needed after dependency changes)
echo   prod            Run in production mode (disable hot-reload)
echo   dev             Re-enable development mode
echo   clean           Stop and remove all containers, volumes
echo   status          Show running containers
echo.
echo Examples:
echo   dev.bat up              # Start development environment
echo   dev.bat logs backend    # View backend logs
echo   dev.bat prod            # Switch to production mode
echo   dev.bat build           # Rebuild after npm/pip install
echo.
goto :eof

:up
echo Starting development environment...
docker-compose up -d
echo.
echo Services started!
echo    Frontend: http://localhost:4000
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo View logs: dev.bat logs
goto :eof

:down
echo Stopping services...
docker-compose down
echo Services stopped
goto :eof

:restart
echo Restarting services...
docker-compose restart
echo Services restarted
goto :eof

:logs
if "%2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %2
)
goto :eof

:build
echo Rebuilding containers...
docker-compose up --build -d
echo Rebuild complete
goto :eof

:prod
echo Switching to production mode...
if exist "%OVERRIDE_FILE%" (
    move "%OVERRIDE_FILE%" "%BACKUP_FILE%" >nul
    echo Development override disabled
    echo Starting in production mode...
    docker-compose -f docker-compose.yml up -d
) else (
    echo Already in production mode
    docker-compose -f docker-compose.yml up -d
)
goto :eof

:dev
echo Enabling development mode...
if exist "%BACKUP_FILE%" (
    move "%BACKUP_FILE%" "%OVERRIDE_FILE%" >nul
    echo Development override enabled
) else (
    echo Already in development mode
)
docker-compose up -d
goto :eof

:clean
echo Cleaning up containers and volumes...
set /p CONFIRM="This will remove all containers and volumes. Continue? (y/N): "
if /i "%CONFIRM%"=="y" (
    docker-compose down -v
    echo Cleanup complete
) else (
    echo Cancelled
)
goto :eof

:status
docker-compose ps
goto :eof

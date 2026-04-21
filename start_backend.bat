@echo off
cd /d "%~dp0"

echo Stopping any existing backend servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo Starting NEXRA Backend Server...
uvicorn app.main:app --reload

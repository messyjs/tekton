@echo off
title Tekton Dashboard Stop
echo Stopping Tekton Dashboard...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7700 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a
    taskkill /PID %%a /F 2>nul
)
echo Done.
timeout /t 2 /nobreak >nul

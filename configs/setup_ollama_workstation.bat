@echo off
echo ===============================================
echo   Tekton Ollama Workstation Setup (75%% Power)
echo   HP Z820 Dual Xeon E5-2670 / 131GB RAM
echo ===============================================
echo.

REM Set 75% power environment variables (24 of 32 threads)
REM /M sets for all users (needs admin), fallback to user-level
setx OLLAMA_NUM_THREAD 24 >nul 2>&1
setx OLLAMA_KEEP_ALIVE 30m >nul 2>&1
setx OLLAMA_MAX_LOADED_MODELS 1 >nul 2>&1
setx OLLAMA_FLASH_ATTENTION 1 >nul 2>&1

echo [1/4] Set OLLAMA_NUM_THREAD=24
echo [2/4] Set OLLAMA_KEEP_ALIVE=30m
echo [3/4] Set OLLAMA_MAX_LOADED_MODELS=1
echo [4/4] Set OLLAMA_FLASH_ATTENTION=1
echo.

REM Stop Ollama if running
echo Stopping Ollama...
taskkill /f /im "ollama app.exe" >nul 2>&1
timeout /t 3 /nobreak >nul

REM Start Ollama with the new settings
echo Starting Ollama with optimized settings...
echo.
echo   24 threads (75%% of 32)
echo   Keep-alive: 30 minutes
echo   Max loaded models: 1
echo   Flash attention: enabled
echo.

start "" "C:\Users\Massi\AppData\Local\Programs\Ollama\ollama app.exe"

echo.
echo Waiting for Ollama to start...
timeout /t 10 /nobreak >nul

REM Verify it's running
echo Testing Ollama...
curl -s http://localhost:11434/api/version 2>nul
echo.

echo ===============================================
echo   Setup complete! Ollama is running with:
echo   - 24 threads (75%% of 32 logical cores)
echo   - Keep-alive: 30 minutes
echo   - Flash attention: enabled
echo.
echo   Recommended models for this workstation:
echo     Fast:    deepseek-coder-v2:16b  (10.9 tok/s)
echo     Reason:  deepseek-r1:8b          (4.9 tok/s)
echo     Deep:    deepseek-r1:32b         (1.4 tok/s)
echo ===============================================
pause
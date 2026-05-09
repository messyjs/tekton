@echo off
REM =========================================
REM  TEKTON PLAY - Resume from checkpoint
REM  1. Plays pizza.wav notification
REM  2. Starts Dashboard (7700) and Command Center (7799)
REM  3. Verifies services
REM  4. Launches Tekton with thinking=medium and Qwen3.5-27B model
REM =========================================
echo.
echo  ========================================
echo   TEKTON PLAY - Session Resume
echo  ========================================
echo.

REM Step 1: Play notification sound
echo [1/4] Playing notification sound...
powershell -NoProfile -Command "(New-Object System.Media.SoundPlayer 'C:\Users\Massi\Desktop\Car horns all\Pizza.wav').PlaySync()"

REM Step 2: Start Dashboard
echo [2/4] Starting Dashboard on port 7700...
start "Tekton Dashboard" /MIN cmd /c "cd /d "D:\AI Drive\pi-agent\tekton" && node dashboard-enhanced.mjs --port 7700 --host 0.0.0.0"
timeout /t 3 /nobreak >nul

REM Step 3: Start Command Center
echo [3/4] Starting Command Center on port 7799...
start "Tekton Gann" /MIN cmd /c "cd /d "D:\AI Drive\pi-agent\tekton\packages\gann-app" && python gann_app.py --port 7799"
timeout /t 4 /nobreak >nul

REM Step 4: Verify services
echo [4/4] Verifying services...
curl -s http://localhost:7700/ >nul 2>&1 && echo   [OK] Dashboard running on port 7700 || echo   [FAIL] Dashboard not responding
curl -s http://localhost:7799/api/engines >nul 2>&1 && echo   [OK] Command Center running on port 7799 || echo   [FAIL] Command Center not responding

echo.
echo  ========================================
echo   Services started! Launching Tekton...
echo   Model: Qwen3.5-27B (instruction-following)
echo   Thinking: medium
echo.
echo   Type /tekton:play to resume from checkpoint
echo  ========================================
echo.

REM Step 5: Launch Tekton with Qwen3.5-27B and thinking=medium
cd /d "D:\AI Drive\pi-agent\tekton"
node packages\pi-agent-service\dist\cli.js --thinking medium --model "kwangsuklee/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled-GGUF:latest"
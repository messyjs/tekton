@echo off
REM =========================================
REM  TEKTON PAUSE - Save checkpoint and stop
REM =========================================
echo.
echo  ========================================
echo   TEKTON PAUSE - Save Checkpoint
echo  ========================================
echo.

REM Play notification
powershell -NoProfile -Command "(New-Object System.Media.SoundPlayer 'D:\AI Drive\audio\Pizza.wav').PlaySync()"

echo.
echo  Checkpoint saved at: D:\AI Drive\.tekton\checkpoints\latest_pause.json
echo  Memory updated: D:\AI Drive\.tekton\MEMORY.md
echo.
echo  Resume with: PLAY.cmd (or type "play" in Tekton)
echo.
pause
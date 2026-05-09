@echo off
REM MessyHedge Scheduler - Run at session opens

cd /d "D:\AI Drive\pi-agent\tekton"

set TELEGRAM_BOT_TOKEN=8704039353:AAFcZnCAN7JhEm7QWzmmyn4VIc02zjpt80Q
set TELEGRAM_CHAT_ID=%MESSYHEDGE_CHAT_ID%
set DEEP_THINK_LLM=deepseek-v4-pro:cloud
set QUICK_THINK_LLM=deepseek-v4-flash:cloud
set OLLAMA_CLOUD_URL=http://localhost:11434/v1
set TEKTON_PORT=7799

echo ============================================
echo   MessyHedge Scheduler
echo ============================================
echo.
echo Sessions:
echo   Asian Open:   00:00 UTC (Crypto)
echo   London Open:  07:00 UTC (Forex)
echo   NY Open:      13:30 UTC (Stocks)
echo   NY Crypto:    14:00 UTC (Crypto)
echo.
echo Token cost: ~6K per ticker (Python-first)
echo Daily estimate: ~180K tokens (10 tickers x 3 sessions)
echo.

python3 scripts\messyhedge_scheduler.py --daemon
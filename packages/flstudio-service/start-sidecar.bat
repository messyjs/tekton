@echo off
:: Tekton FL Studio Sidecar Launcher
:: Starts the HTTP server for web UI access
echo ============================================
echo   Tekton FL Studio - Sidecar Server
echo ============================================
echo.
echo Starting sidecar on port 7704...
echo.
echo   Web UI:  http://localhost:7704/ui
echo   Phone:   http://192.168.68.61:7704/ui
echo.
echo   Make sure FL Studio is running with the bridge enabled!
echo   (Options ^> MIDI Settings ^> Tekton FL Studio Bridge)
echo.
echo Press Ctrl+C to stop the server.
echo ============================================
cd /d "%~dp0"
python -m uvicorn src.tekton_flstudio.server:create_app --factory --host 0.0.0.0 --port 7704
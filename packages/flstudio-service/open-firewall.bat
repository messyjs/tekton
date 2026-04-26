@echo off
:: Tekton FL Studio - Open Firewall for Phone Access
:: Right-click this file and select "Run as Administrator"
echo ============================================
echo   Tekton FL Studio - Firewall Setup
echo ============================================
echo.
echo Opening ports 7704-7706 for phone/tablet access...
echo.
netsh advfirewall firewall add rule name="Tekton FL Studio" dir=in action=allow protocol=tcp localport=7704-7706 profile=any
echo.
if %errorlevel% equ 0 (
    echo ✅ Firewall rule added successfully!
    echo.
    echo You can now connect from your phone at:
    echo    http://192.168.68.61:7704/ui
) else (
    echo ❌ Failed to add firewall rule.
    echo Make sure you ran this as Administrator.
)
echo.
echo ============================================
pause
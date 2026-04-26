@echo off
echo Adding Tekton FL Studio firewall rules...
netsh advfirewall firewall add rule name="Tekton FL Studio" dir=in action=allow protocol=tcp localport=7704-7706 profile=any
echo.
echo Done! You can now connect from your phone.
pause

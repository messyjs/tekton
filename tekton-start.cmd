@echo off
REM Tekton Agent startup with thinking enabled
REM Default thinking level: medium (good for complex tasks)

REM Play Pizza.wav notification sound on startup
powershell -NoProfile -Command "(New-Object System.Media.SoundPlayer 'D:\AI Drive\audio\Pizza.wav').PlaySync()"

cd /d "D:\AI Drive\pi-agent\tekton"
node packages/pi-agent-service/dist/cli.js %* --thinking medium
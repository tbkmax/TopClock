@echo off
echo Start the updated TopClock before continuing.
echo The default test records eight hours. Keep this window open.
pause
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Test-TopClockLongRun.ps1" %*
pause

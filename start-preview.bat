@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (
  start "" "http://127.0.0.1:4178/"
  py -m http.server 4178
  exit /b
)

where python >nul 2>&1
if %errorlevel%==0 (
  start "" "http://127.0.0.1:4178/"
  python -m http.server 4178
  exit /b
)

echo Python was not found.
echo Please open this folder with Visual Studio Code Live Server.
pause

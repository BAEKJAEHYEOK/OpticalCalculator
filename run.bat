@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Optical Calculator
echo ------------------------------------------------
echo   PC       : http://127.0.0.1:8123/index.html
echo.
echo   Phone    : connect to the same Wi-Fi, then use
echo              one of the addresses below with :8123
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo             http://%%a:8123/index.html
echo.
echo   Verify   : http://127.0.0.1:8123/verify.html
echo ------------------------------------------------
echo   Close this window to stop the server.
echo.

start "Optical Calculator server" /min python -m http.server 8123
timeout /t 2 >nul
start "" "http://127.0.0.1:8123/index.html"

echo Server running. Press any key to stop.
pause >nul
taskkill /fi "WINDOWTITLE eq Optical Calculator server*" /f >nul 2>&1

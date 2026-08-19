@echo off
chcp 65001 >nul
cd /d "%~dp0"
python scripts\dev_server.py %1
pause

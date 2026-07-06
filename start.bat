@echo off
REM ===== Stackable PDF Tools - one-click launcher (Windows) =====
title Stackable PDF Tools
cd /d "%~dp0"

echo.
echo   Stackable PDF Tools
echo   ===================
echo.

REM --- Check that Node.js is installed ---
where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js is not installed.
  echo.
  echo   This app needs Node.js to run. It's free:
  echo       https://nodejs.org/  ^(download the "LTS" version, install, then
  echo       double-click this file again^)
  echo.
  start "" "https://nodejs.org/en/download"
  pause
  exit /b 1
)

REM --- Install dependencies the first time only ---
if not exist "node_modules" (
  echo   First run - installing components ^(this takes a minute^)...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   [!] Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo.
echo   Starting... your browser will open automatically at http://localhost:5173
echo   Keep this window open while you use the app. Close it when you're done.
echo.

call npm run dev
pause

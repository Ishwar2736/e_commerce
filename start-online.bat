@echo off
title OmniStore Online Server Launcher
cd /d "%~dp0"

echo ======================================================
echo   Launching OmniStore Independent Server & Tunnel
echo ======================================================
echo.
echo Starting local web server in its own window...
start "OmniStore Backend Server" cmd /k "node api/index.js"

echo Waiting 3 seconds for server to initialize...
timeout /t 3 /nobreak >nul

echo Starting Cloudflare public tunnel for mobile/external access...
start "OmniStore Public Online Tunnel" cmd /k "npx --yes cloudflared tunnel --url http://localhost:3000"

echo.
echo ======================================================
echo   OmniStore is now running INDEPENDENTLY!
echo.
echo   - Two separate command windows have been opened.
echo   - Check the "OmniStore Public Online Tunnel" window
echo     to see your live https://*.trycloudflare.com link.
echo   - You can completely CLOSE Antigravity now.
echo   - As long as those two windows stay open, your
echo     website will stay live on all phones & computers.
echo ======================================================
echo.
pause

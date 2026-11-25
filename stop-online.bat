@echo off
title Stop OmniStore
echo Stopping OmniStore and cloudflared processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1
echo OmniStore server and online tunnel have been stopped.
pause

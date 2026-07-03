@echo off
echo Starting TikTok Bulk Downloader...
echo.

echo [Backend] Launching FastAPI on http://localhost:8000
start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000 --host 0.0.0.0"

timeout /t 2 /nobreak >nul

echo [Frontend] Launching Next.js on http://localhost:3000
start "Frontend - Next.js" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Open http://localhost:3000 in your browser.

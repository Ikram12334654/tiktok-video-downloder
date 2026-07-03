@echo off
setlocal

if not exist venv (
    echo ERROR: venv not found. Run setup.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Starting FastAPI backend on http://localhost:8000
echo Press Ctrl+C to stop.
echo.

uvicorn main:app --reload --port 8000 --host 0.0.0.0

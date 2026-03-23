@echo off
title SpriteLab
echo ============================================
echo        SpriteLab - Sprite Editor
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo.
)

:: Check if .env exists
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env >nul
    echo [WARN] Please edit .env with your database URL and API keys.
    echo.
)

:: Generate Prisma client if not present
if not exist "src\generated\prisma\" (
    echo [INFO] Generating Prisma client...
    call npx prisma generate
    echo.
)

echo [INFO] Starting dev server on http://localhost:3000
echo [INFO] Press Ctrl+C to stop.
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Start Next.js dev server
call npx next dev --turbopack

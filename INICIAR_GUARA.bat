@echo off
title Guara Engine - Iniciador
color 0C
echo ===================================================
echo       INICIANDO GUARA ENGINE - MODO TATICO
echo ===================================================
echo.
echo [1/3] Iniciando Servidor Backend (FastAPI)...
start "Guara Backend" cmd /c "cd backend && title Guara Backend && color 0A && .\venv\Scripts\python main.py"

echo [2/3] Iniciando Servidor Frontend (Next.js)...
start "Guara Frontend" cmd /c "cd frontend && title Guara Frontend && color 09 && npm run dev"

echo.
echo [3/3] Aguardando os motores ligarem...
timeout /t 5 /nobreak >nul

echo Abrindo o Painel Tatico no navegador padrão...
start http://localhost:3000

echo.
echo ===================================================
echo   TODOS OS SISTEMAS ONLINE! 
echo   (Mantenha as duas telas pretas abertas enquanto usa)
echo ===================================================
echo.
pause

@echo off
echo ========================================
echo   TESTE RAPIDO - DESCOBRIR CHAT ID
echo ========================================
echo.
echo 1. Este script vai iniciar o bot
echo 2. Envie /start no Telegram pro bot
echo 3. Veja o console - seu CHAT ID aparecera
echo.
echo Pressione qualquer tecla para continuar...
pause >nul

cd /d "%~dp0"
echo.
echo Iniciando sistema...
echo.
npx ts-node start-all.ts

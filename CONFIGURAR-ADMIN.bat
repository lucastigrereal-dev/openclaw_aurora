@echo off
chcp 65001 >nul
title Configurar Admin - OpenClaw Aurora

echo ╔══════════════════════════════════════════════════════════╗
echo ║      CONFIGURAR ADMIN - OPENCLAW AURORA                  ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo 🎯 OPÇÕES:
echo.
echo 1. Descobrir Chat ID Automaticamente (Recomendado)
echo 2. Inserir Chat ID Manualmente
echo 3. Testar sem configurar (só ver o sistema)
echo 4. Sair
echo.
set /p opcao="Escolha uma opcao (1-4): "

if "%opcao%"=="1" goto auto
if "%opcao%"=="2" goto manual
if "%opcao%"=="3" goto testar
if "%opcao%"=="4" exit
goto menu

:auto
echo.
echo ═══════════════════════════════════════════════════════════
echo   DESCOBRINDO CHAT ID AUTOMATICAMENTE
echo ═══════════════════════════════════════════════════════════
echo.
echo 📱 INSTRUÇÕES:
echo.
echo 1. Abra o Telegram AGORA
echo 2. Busque: @Prometheus_tigre_bot
echo 3. Envie: /start
echo.
echo Pressione ENTER quando tiver enviado...
pause >nul

echo.
echo 🔍 Buscando seu Chat ID...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0GET-CHAT-ID.ps1"

echo.
echo Pressione ENTER para voltar ao menu...
pause >nul
goto menu

:manual
echo.
echo ═══════════════════════════════════════════════════════════
echo   INSERIR CHAT ID MANUALMENTE
echo ═══════════════════════════════════════════════════════════
echo.
echo Como descobrir seu Chat ID:
echo.
echo Método 1 (Mais Fácil):
echo   1. Abra o Telegram
echo   2. Busque: @userinfobot
echo   3. Envie: /start
echo   4. Copie o número que aparecer em "Id"
echo.
echo Método 2 (Usando API):
echo   1. Abra no navegador:
echo      https://api.telegram.org/bot8017049336:AAFgjCG7s5kq_7OvQ3XrdFwanoow9eYx3lY/getUpdates
echo   2. ANTES, envie /start pro @Prometheus_tigre_bot
echo   3. Procure "chat": { "id": 123456789 }
echo.
set /p chatid="Digite seu Chat ID: "

echo.
echo 💾 Salvando configuração...

REM Ler .env atual
set envfile="%~dp0.env"
set tempfile="%~dp0.env.temp"

REM Verificar se já tem TELEGRAM_CHAT_ID
findstr /C:"TELEGRAM_CHAT_ID" %envfile% >nul

if %errorlevel%==0 (
    REM Substituir linha existente
    powershell -Command "(Get-Content %envfile%) -replace 'TELEGRAM_CHAT_ID=.*', 'TELEGRAM_CHAT_ID=%chatid%' | Set-Content %envfile%"
) else (
    REM Adicionar nova linha
    echo. >> %envfile%
    echo # Admin Chat ID >> %envfile%
    echo TELEGRAM_CHAT_ID=%chatid% >> %envfile%
)

echo.
echo ✅ Chat ID configurado: %chatid%
echo.
echo O arquivo .env foi atualizado!
echo.
echo Deseja iniciar o sistema agora? (S/N)
set /p iniciar=""

if /i "%iniciar%"=="S" (
    echo.
    echo 🚀 Iniciando OpenClaw Aurora...
    echo.
    call "%~dp0START-AURORA.bat"
) else (
    echo.
    echo Para iniciar depois, execute: START-AURORA.bat
    echo.
)

echo.
echo Pressione ENTER para sair...
pause >nul
exit

:testar
echo.
echo ═══════════════════════════════════════════════════════════
echo   TESTAR SEM CONFIGURAR
echo ═══════════════════════════════════════════════════════════
echo.
echo ⚠️  ATENÇÃO:
echo.
echo - Sistema vai iniciar SEM admin configurado
echo - Você pode ver como funciona
echo - Telegram bot vai conectar, mas não terá admin
echo.
echo Deseja continuar? (S/N)
set /p continuar=""

if /i "%continuar%"=="S" (
    echo.
    echo 🚀 Iniciando OpenClaw Aurora...
    echo.
    call "%~dp0START-AURORA.bat"
) else (
    goto menu
)

exit

:menu
cls
goto inicio

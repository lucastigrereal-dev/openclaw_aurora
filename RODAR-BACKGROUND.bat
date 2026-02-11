@echo off
echo ========================================
echo   OPENCLAW AURORA - MODO BACKGROUND
echo ========================================
echo.
echo Este script vai iniciar o sistema em background
echo usando PM2 (Process Manager)
echo.
echo O sistema vai:
echo  - Rodar em background
echo  - Auto-restart se cair
echo  - Persistir entre reinicializacoes
echo.
pause

cd /d "%~dp0"

echo.
echo [1/3] Verificando PM2...
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 nao encontrado. Instalando...
    npm install -g pm2
)

echo.
echo [2/3] Parando instancias antigas...
pm2 delete openclaw-aurora 2>nul

echo.
echo [3/3] Iniciando em background...
pm2 start dist/start-all.js --name openclaw-aurora

echo.
echo ========================================
echo   SISTEMA RODANDO EM BACKGROUND!
echo ========================================
echo.
echo Comandos uteis:
echo   pm2 list               # Ver processos
echo   pm2 logs openclaw      # Ver logs
echo   pm2 restart openclaw   # Reiniciar
echo   pm2 stop openclaw      # Parar
echo   pm2 delete openclaw    # Remover
echo.
echo O sistema vai continuar rodando mesmo
echo se voce fechar este terminal!
echo.
pause

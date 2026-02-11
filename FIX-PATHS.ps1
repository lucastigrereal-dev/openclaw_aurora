# ============================================================================
# OPENCLAW AURORA - FIX PATHS AFTER MOVE
# ============================================================================
$ErrorActionPreference = "Stop"

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "========================================================" Cyan
Write-Color "    OPENCLAW AURORA - CORRIGINDO CAMINHOS              " Cyan
Write-Color "========================================================" Cyan
Write-Host ""

$CURRENT_PATH = $PSScriptRoot
Write-Color "[OK] Caminho detectado: $CURRENT_PATH" Green
Write-Host ""

# ============================================================================
# 1. CORRIGIR START-AURORA.bat
# ============================================================================
Write-Color "[1/4] Corrigindo START-AURORA.bat..." Yellow

$bat1 = "@echo off`r`n"
$bat1 += "cd /d `"$CURRENT_PATH`"`r`n"
$bat1 += "echo Iniciando OpenClaw Aurora...`r`n"
$bat1 += "npx ts-node start-all.ts`r`n"
$bat1 += "pause`r`n"

Set-Content -Path "$CURRENT_PATH\START-AURORA.bat" -Value $bat1 -Encoding ASCII -NoNewline
Write-Color "  [OK] START-AURORA.bat atualizado" Green

# ============================================================================
# 2. CRIAR START-WEBSOCKET.bat
# ============================================================================
Write-Color "[2/4] Criando START-WEBSOCKET.bat..." Yellow

$bat2 = "@echo off`r`n"
$bat2 += "cd /d `"$CURRENT_PATH`"`r`n"
$bat2 += "echo Iniciando WebSocket Server...`r`n"
$bat2 += "npx ts-node main.ts`r`n"
$bat2 += "pause`r`n"

Set-Content -Path "$CURRENT_PATH\START-WEBSOCKET.bat" -Value $bat2 -Encoding ASCII -NoNewline
Write-Color "  [OK] START-WEBSOCKET.bat criado" Green

# ============================================================================
# 3. CRIAR START-TELEGRAM.bat
# ============================================================================
Write-Color "[3/4] Criando START-TELEGRAM.bat..." Yellow

$bat3 = "@echo off`r`n"
$bat3 += "cd /d `"$CURRENT_PATH`"`r`n"
$bat3 += "echo Iniciando Telegram Bot...`r`n"
$bat3 += "npx ts-node telegram-bot.ts`r`n"
$bat3 += "pause`r`n"

Set-Content -Path "$CURRENT_PATH\START-TELEGRAM.bat" -Value $bat3 -Encoding ASCII -NoNewline
Write-Color "  [OK] START-TELEGRAM.bat criado" Green

# ============================================================================
# 4. VERIFICAR PM2
# ============================================================================
Write-Color "[4/4] Verificando PM2..." Yellow

try {
    $pm2List = pm2 list 2>&1 | Out-String
    if ($pm2List -match "openclaw" -or $pm2List -match "aurora") {
        Write-Color "  [AVISO] Processos PM2 detectados - execute: pm2 delete all" Yellow
    } else {
        Write-Color "  [OK] Nenhum processo PM2 rodando" Green
    }
} catch {
    Write-Color "  [OK] PM2 nao instalado" Green
}

# ============================================================================
# FINALIZADO
# ============================================================================
Write-Host ""
Write-Color "========================================================" Green
Write-Color "           CORRECAO CONCLUIDA COM SUCESSO!             " Green
Write-Color "========================================================" Green
Write-Host ""
Write-Color "Scripts criados:" White
Write-Color "  - START-AURORA.bat     (sistema completo)" White
Write-Color "  - START-WEBSOCKET.bat  (so WebSocket)" White
Write-Color "  - START-TELEGRAM.bat   (so Telegram)" White
Write-Host ""
Write-Color "Caminho atual: $CURRENT_PATH" Cyan
Write-Host ""
Write-Color "Pronto! Use START-AURORA.bat para iniciar." Green
Write-Host ""

# ============================================================================
# DEPLOY AUTOMÁTICO - OPENCLAW AURORA
# Execute: powershell -ExecutionPolicy Bypass -File deploy-auto.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     OPENCLAW AURORA - DEPLOY AUTOMATICO                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$VERCEL_TOKEN = "1xZDeGW1lg5RvNoUzOexBXas"
$RAILWAY_TOKEN = "ad44146e-e0a2-4a56-886a-244b47c9aec6"
$REPO_PATH = "$env:USERPROFILE\openclaw_aurora"

# ============================================================================
# 1. ATUALIZAR REPOSITÓRIO
# ============================================================================
Write-Host "`n[1/5] Atualizando repositório..." -ForegroundColor Yellow

if (Test-Path $REPO_PATH) {
    Set-Location $REPO_PATH
    git pull origin claude/monitoring-crash-prevention-Qx84d
} else {
    Set-Location $env:USERPROFILE
    git clone https://github.com/lucastigrereal-dev/openclaw_aurora.git
    Set-Location $REPO_PATH
    git checkout claude/monitoring-crash-prevention-Qx84d
}

Write-Host "  ✓ Repositório atualizado" -ForegroundColor Green

# ============================================================================
# 2. INSTALAR DEPENDÊNCIAS
# ============================================================================
Write-Host "`n[2/5] Instalando dependências..." -ForegroundColor Yellow

npm install
if (Test-Path "dashboard-prometheus") {
    Set-Location dashboard-prometheus
    npm install -g pnpm 2>$null
    pnpm install
    Set-Location ..
}

Write-Host "  ✓ Dependências instaladas" -ForegroundColor Green

# ============================================================================
# 3. DEPLOY BACKEND NO RAILWAY
# ============================================================================
Write-Host "`n[3/5] Deploy do Backend no Railway..." -ForegroundColor Yellow

npm install -g @railway/cli 2>$null
$env:RAILWAY_TOKEN = $RAILWAY_TOKEN

# Inicializa projeto se necessário
railway link 2>$null
if ($LASTEXITCODE -ne 0) {
    railway init --name "openclaw-aurora"
}

# Deploy
railway up --detach

Write-Host "  ✓ Backend deploy iniciado" -ForegroundColor Green

# Configura variáveis de ambiente
Write-Host "  → Configurando variáveis..." -ForegroundColor Cyan
railway variables set NODE_ENV=production 2>$null
railway variables set PORT=18789 2>$null

# Pega a URL do Railway
$RAILWAY_URL = railway domain 2>$null
if (-not $RAILWAY_URL) {
    $RAILWAY_URL = "openclaw-aurora.up.railway.app"
}

Write-Host "  ✓ Backend URL: https://$RAILWAY_URL" -ForegroundColor Green

# ============================================================================
# 4. DEPLOY DASHBOARD NO VERCEL
# ============================================================================
Write-Host "`n[4/5] Deploy do Dashboard no Vercel..." -ForegroundColor Yellow

npm install -g vercel 2>$null
Set-Location dashboard-prometheus

# Configura variável do WebSocket
$env:VITE_WEBSOCKET_URL = "wss://$RAILWAY_URL"

# Deploy
vercel --prod --yes --token $VERCEL_TOKEN

Set-Location ..
Write-Host "  ✓ Dashboard deploy concluído" -ForegroundColor Green

# ============================================================================
# 5. RESULTADO FINAL
# ============================================================================
Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              DEPLOY CONCLUÍDO COM SUCESSO!               ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  Backend (Railway):                                      ║" -ForegroundColor Green
Write-Host "║    https://$RAILWAY_URL" -ForegroundColor White
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  WebSocket:                                              ║" -ForegroundColor Green
Write-Host "║    wss://$RAILWAY_URL" -ForegroundColor White
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║  Dashboard (Vercel):                                     ║" -ForegroundColor Green
Write-Host "║    Verifique o output acima para a URL                   ║" -ForegroundColor White
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`nSistema online 24/7 na nuvem!" -ForegroundColor Cyan

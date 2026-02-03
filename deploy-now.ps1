# OpenClaw Aurora - Direct Deploy Script
# Run this on Windows PowerShell

$ErrorActionPreference = "Stop"

# ===== CONFIGURATION =====
$VERCEL_TOKEN = "1xZDeGW1lg5RvNoUzOexBXas"
$RAILWAY_TOKEN = "ad44146e-e0a2-4a56-886a-244b47c9aec6"
$VERCEL_ORG_ID = "lucas-projects-ffa9a1fb"
$REPO_URL = "https://github.com/lucastigrereal-dev/openclaw_aurora.git"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   OpenClaw Aurora - Deploy Script     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js not found. Installing via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host "`nNode version: $(node --version)" -ForegroundColor Green

# Install CLIs
Write-Host "`n[1/5] Installing Railway and Vercel CLIs..." -ForegroundColor Yellow
npm install -g @railway/cli vercel pnpm

# Clone/Pull repo
$WORK_DIR = "$env:TEMP\openclaw_aurora_deploy"
if (Test-Path $WORK_DIR) {
    Write-Host "`n[2/5] Updating repository..." -ForegroundColor Yellow
    Set-Location $WORK_DIR
    git pull origin claude/monitoring-crash-prevention-Qx84d
} else {
    Write-Host "`n[2/5] Cloning repository..." -ForegroundColor Yellow
    git clone --branch claude/monitoring-crash-prevention-Qx84d $REPO_URL $WORK_DIR
    Set-Location $WORK_DIR
}

# Deploy Backend to Railway
Write-Host "`n[3/5] Deploying Backend to Railway..." -ForegroundColor Yellow
$env:RAILWAY_TOKEN = $RAILWAY_TOKEN

try {
    railway login --browserless 2>$null
    railway init --name "openclaw-aurora-backend" 2>$null
    $RAILWAY_RESULT = railway up --detach
    Write-Host "Railway deploy initiated!" -ForegroundColor Green

    # Get Railway domain
    $RAILWAY_DOMAIN = railway domain 2>$null
    if ($RAILWAY_DOMAIN) {
        Write-Host "Railway Domain: $RAILWAY_DOMAIN" -ForegroundColor Cyan
        $WEBSOCKET_URL = "wss://$RAILWAY_DOMAIN/api/v1/ws"
    } else {
        $WEBSOCKET_URL = "wss://openclaw-aurora-backend.up.railway.app/api/v1/ws"
    }
} catch {
    Write-Host "Railway deploy error: $_" -ForegroundColor Red
    $WEBSOCKET_URL = "ws://localhost:18789/api/v1/ws"
}

# Deploy Dashboard to Vercel
Write-Host "`n[4/5] Deploying Dashboard to Vercel..." -ForegroundColor Yellow
Set-Location "$WORK_DIR\dashboard"

# Install dependencies
pnpm install

# Build with WebSocket URL
$env:VITE_WEBSOCKET_URL = $WEBSOCKET_URL
pnpm build

# Deploy to Vercel
$env:VERCEL_ORG_ID = $VERCEL_ORG_ID

try {
    $VERCEL_OUTPUT = vercel --prod --yes --token $VERCEL_TOKEN 2>&1
    $VERCEL_URL = $VERCEL_OUTPUT | Select-String -Pattern "https://.*\.vercel\.app" | ForEach-Object { $_.Matches[0].Value }

    if ($VERCEL_URL) {
        Write-Host "Vercel Dashboard: $VERCEL_URL" -ForegroundColor Cyan
    } else {
        Write-Host "Vercel output: $VERCEL_OUTPUT" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Vercel deploy error: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "           DEPLOY COMPLETE             " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend (Railway): Check railway.app dashboard" -ForegroundColor White
Write-Host "WebSocket URL: $WEBSOCKET_URL" -ForegroundColor White
if ($VERCEL_URL) {
    Write-Host "Dashboard (Vercel): $VERCEL_URL" -ForegroundColor White
}
Write-Host ""
Write-Host "To run locally:" -ForegroundColor Yellow
Write-Host "  cd $WORK_DIR" -ForegroundColor Gray
Write-Host "  npm install && npm run dev" -ForegroundColor Gray
Write-Host ""

# Return to original directory
Set-Location $env:USERPROFILE

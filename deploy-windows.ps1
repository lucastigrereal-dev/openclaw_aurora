# ============================================================================
# OPENCLAW AURORA - SCRIPT DE DEPLOY WINDOWS
# Execute no PowerShell como Administrador
# ============================================================================

$ErrorActionPreference = "Stop"

# Cores para output
function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "╔══════════════════════════════════════════════════════════╗" Cyan
Write-Color "║         OPENCLAW AURORA - DEPLOY WINDOWS                 ║" Cyan
Write-Color "╚══════════════════════════════════════════════════════════╝" Cyan
Write-Host ""

# ============================================================================
# CONFIGURAÇÃO - ALTERE AQUI SE NECESSÁRIO
# ============================================================================
$INSTALL_PATH = "$env:USERPROFILE\openclaw_aurora"
$REPO_URL = "https://github.com/lucastigrereal-dev/openclaw_aurora.git"
$BRANCH = "claude/monitoring-crash-prevention-Qx84d"

# ============================================================================
# 1. VERIFICAR PRÉ-REQUISITOS
# ============================================================================
Write-Color "[1/6] Verificando pré-requisitos..." Yellow

# Verifica Node.js
try {
    $nodeVersion = node --version
    Write-Color "  ✓ Node.js instalado: $nodeVersion" Green
} catch {
    Write-Color "  ✗ Node.js não encontrado!" Red
    Write-Color "  → Instale em: https://nodejs.org/" Yellow
    exit 1
}

# Verifica Git
try {
    $gitVersion = git --version
    Write-Color "  ✓ Git instalado: $gitVersion" Green
} catch {
    Write-Color "  ✗ Git não encontrado!" Red
    Write-Color "  → Instale em: https://git-scm.com/" Yellow
    exit 1
}

# ============================================================================
# 2. CLONAR OU ATUALIZAR REPOSITÓRIO
# ============================================================================
Write-Color "[2/6] Configurando repositório..." Yellow

if (Test-Path $INSTALL_PATH) {
    Write-Color "  → Diretório existe, atualizando..." Cyan
    Set-Location $INSTALL_PATH
    git fetch origin $BRANCH
    git checkout $BRANCH
    git pull origin $BRANCH
    Write-Color "  ✓ Repositório atualizado" Green
} else {
    Write-Color "  → Clonando repositório..." Cyan
    git clone $REPO_URL $INSTALL_PATH
    Set-Location $INSTALL_PATH
    git checkout $BRANCH
    Write-Color "  ✓ Repositório clonado" Green
}

# ============================================================================
# 3. INSTALAR DEPENDÊNCIAS
# ============================================================================
Write-Color "[3/6] Instalando dependências..." Yellow

npm install
if ($LASTEXITCODE -eq 0) {
    Write-Color "  ✓ Dependências instaladas" Green
} else {
    Write-Color "  ✗ Erro ao instalar dependências" Red
    exit 1
}

# ============================================================================
# 4. CONFIGURAR .ENV (SE NÃO EXISTIR)
# ============================================================================
Write-Color "[4/6] Verificando configuração..." Yellow

$envFile = "$INSTALL_PATH\.env"
if (-not (Test-Path $envFile)) {
    Write-Color "  → Criando arquivo .env..." Cyan
    @"
# ============================================================================
# OPENCLAW AURORA - CONFIGURAÇÃO
# ============================================================================

# Telegram Bot
TELEGRAM_BOT_TOKEN=SEU_TOKEN_AQUI
TELEGRAM_CHAT_ID=SEU_CHAT_ID_AQUI

# Claude (Anthropic)
ANTHROPIC_API_KEY=SUA_KEY_AQUI

# OpenAI GPT
OPENAI_API_KEY=SUA_KEY_AQUI

# Ollama (opcional)
OLLAMA_URL=http://localhost:11434
OLLAMA_ENABLED=false

# Aurora Monitor
AURORA_PORT=18790
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Color "  ⚠ IMPORTANTE: Edite o arquivo .env com suas chaves!" Yellow
    Write-Color "    Caminho: $envFile" Yellow
} else {
    Write-Color "  ✓ Arquivo .env já existe" Green
}

# ============================================================================
# 5. COMPILAR TYPESCRIPT (OPCIONAL)
# ============================================================================
Write-Color "[5/6] Compilando TypeScript..." Yellow

npm run build 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Color "  ✓ Compilação concluída" Green
} else {
    Write-Color "  → Usando ts-node (sem compilação)" Cyan
}

# ============================================================================
# 6. CRIAR ATALHOS
# ============================================================================
Write-Color "[6/6] Criando scripts de inicialização..." Yellow

# Script para iniciar sistema
$startScript = @"
@echo off
cd /d "$INSTALL_PATH"
echo ╔══════════════════════════════════════════════════════════╗
echo ║         OPENCLAW AURORA - INICIANDO SISTEMA              ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
npx ts-node start-all.ts
pause
"@
$startScript | Out-File -FilePath "$INSTALL_PATH\START-AURORA.bat" -Encoding ASCII

# Script para iniciar só o WebSocket (sem Telegram)
$wsScript = @"
@echo off
cd /d "$INSTALL_PATH"
echo Iniciando WebSocket Server...
npx ts-node main.ts
pause
"@
$wsScript | Out-File -FilePath "$INSTALL_PATH\START-WEBSOCKET.bat" -Encoding ASCII

# Script para testar skills
$testScript = @"
@echo off
cd /d "$INSTALL_PATH"
echo Testando Skills...
npx ts-node test-skills.ts
pause
"@
$testScript | Out-File -FilePath "$INSTALL_PATH\TEST-SKILLS.bat" -Encoding ASCII

Write-Color "  ✓ Scripts criados" Green

# ============================================================================
# FINALIZADO
# ============================================================================
Write-Host ""
Write-Color "╔══════════════════════════════════════════════════════════╗" Green
Write-Color "║              DEPLOY CONCLUÍDO COM SUCESSO!               ║" Green
Write-Color "╠══════════════════════════════════════════════════════════╣" Green
Write-Color "║                                                          ║" Green
Write-Color "║  Localização: $INSTALL_PATH" Green
Write-Color "║                                                          ║" Green
Write-Color "║  Scripts criados:                                        ║" Green
Write-Color "║    • START-AURORA.bat   - Inicia sistema completo        ║" Green
Write-Color "║    • START-WEBSOCKET.bat - Só WebSocket (sem Telegram)   ║" Green
Write-Color "║    • TEST-SKILLS.bat    - Testa todas as skills          ║" Green
Write-Color "║                                                          ║" Green
Write-Color "╠══════════════════════════════════════════════════════════╣" Green
Write-Color "║  PRÓXIMOS PASSOS:                                        ║" Yellow
Write-Color "║                                                          ║" Yellow
Write-Color "║  1. Edite o .env com suas chaves API                     ║" Yellow
Write-Color "║  2. Execute START-AURORA.bat para iniciar                ║" Yellow
Write-Color "║  3. Conecte o Dashboard em ws://localhost:18789          ║" Yellow
Write-Color "║                                                          ║" Yellow
Write-Color "╚══════════════════════════════════════════════════════════╝" Green
Write-Host ""

# Pergunta se quer iniciar agora
$iniciar = Read-Host "Deseja iniciar o sistema agora? (S/N)"
if ($iniciar -eq "S" -or $iniciar -eq "s") {
    Write-Color "Iniciando OpenClaw Aurora..." Cyan
    npx ts-node start-all.ts
}

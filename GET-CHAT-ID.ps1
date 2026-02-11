# ============================================================================
# DESCOBRIR TELEGRAM CHAT ID - MÉTODO RÁPIDO
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

Write-Color "========================================" Cyan
Write-Color "  DESCOBRIR SEU TELEGRAM CHAT ID       " Cyan
Write-Color "========================================" Cyan
Write-Host ""

# Ler token do .env
$envPath = "$PSScriptRoot\.env"
if (-not (Test-Path $envPath)) {
    Write-Color "[ERRO] Arquivo .env nao encontrado!" Red
    Write-Color "Crie o arquivo .env primeiro." Yellow
    exit 1
}

$token = Get-Content $envPath | Select-String "TELEGRAM.*TOKEN" | ForEach-Object {
    $_ -replace '.*=', ''
}

if (-not $token) {
    Write-Color "[ERRO] TELEGRAM_TOKEN nao encontrado no .env!" Red
    exit 1
}

Write-Color "[OK] Token encontrado!" Green
Write-Host ""

# Método 1: Via API
Write-Color "Metodo 1: Usando API do Telegram" Yellow
Write-Host ""
Write-Color "1. Abra o Telegram" White
Write-Color "2. Envie /start pro bot @Prometheus_tigre_bot" White
Write-Color "3. Aguarde 5 segundos..." White
Write-Host ""

Start-Sleep -Seconds 2

Write-Color "Buscando mensagens..." Cyan

try {
    $url = "https://api.telegram.org/bot$token/getUpdates"
    $response = Invoke-RestMethod -Uri $url -Method Get

    if ($response.result.Count -eq 0) {
        Write-Color "[AVISO] Nenhuma mensagem encontrada!" Yellow
        Write-Host ""
        Write-Color "Faca o seguinte:" Yellow
        Write-Color "1. Abra o Telegram" White
        Write-Color "2. Envie /start pro bot" White
        Write-Color "3. Execute este script novamente" White
        Write-Host ""
    } else {
        Write-Color "[SUCESSO] Mensagens encontradas!" Green
        Write-Host ""

        $chatIds = @()
        foreach ($update in $response.result) {
            if ($update.message) {
                $chatId = $update.message.chat.id
                $firstName = $update.message.chat.first_name
                $username = $update.message.chat.username

                if ($chatId -notin $chatIds) {
                    $chatIds += $chatId

                    Write-Color "===========================================" Green
                    Write-Color "  SEU CHAT ID: $chatId" Green
                    Write-Color "  Nome: $firstName" Cyan
                    if ($username) {
                        Write-Color "  Username: @$username" Cyan
                    }
                    Write-Color "===========================================" Green
                    Write-Host ""
                }
            }
        }

        if ($chatIds.Count -gt 0) {
            $mainChatId = $chatIds[0]

            Write-Color "CONFIGURAR AGORA?" Yellow
            Write-Host ""
            Write-Color "Deseja configurar $mainChatId como admin? (S/N)" Yellow
            $resposta = Read-Host

            if ($resposta -eq "S" -or $resposta -eq "s") {
                # Ler .env
                $envContent = Get-Content $envPath

                # Verificar se já existe
                $hasConfig = $envContent | Select-String "TELEGRAM_CHAT_ID"

                if ($hasConfig) {
                    # Substituir
                    $envContent = $envContent -replace "TELEGRAM_CHAT_ID=.*", "TELEGRAM_CHAT_ID=$mainChatId"
                } else {
                    # Adicionar
                    $envContent += ""
                    $envContent += "# Admin Chat ID"
                    $envContent += "TELEGRAM_CHAT_ID=$mainChatId"
                }

                # Salvar
                $envContent | Out-File -FilePath $envPath -Encoding UTF8

                Write-Host ""
                Write-Color "[SUCESSO] Configurado no .env!" Green
                Write-Host ""
                Write-Color "TELEGRAM_CHAT_ID=$mainChatId" Green
                Write-Host ""
                Write-Color "Reinicie o sistema para aplicar:" Yellow
                Write-Color "  START-AURORA.bat" Cyan
                Write-Host ""
            }
        }
    }

} catch {
    Write-Color "[ERRO] Falha ao acessar API: $_" Red
    Write-Host ""
    Write-Color "Use o Metodo 2:" Yellow
    Write-Host ""
}

# Método 2: Manual
Write-Color "========================================" Cyan
Write-Color "  METODO 2: USAR @userinfobot          " Cyan
Write-Color "========================================" Cyan
Write-Host ""
Write-Color "1. Abra o Telegram" White
Write-Color "2. Busque: @userinfobot" White
Write-Color "3. Envie /start" White
Write-Color "4. Copie o 'Id' que aparecer" White
Write-Color "5. Configure manualmente no .env:" White
Write-Host ""
Write-Color "   TELEGRAM_CHAT_ID=seu_id_aqui" Cyan
Write-Host ""

Write-Color "Pressione ENTER para sair..." Gray
Read-Host

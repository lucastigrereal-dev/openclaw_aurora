#!/usr/bin/env bash
set -euo pipefail

# Health checker com backoff e fallback de notificação.
# Uso: sentinela.sh <nome_app> <porta>

if [ "$EUID" -eq 0 ]; then
  echo "ERRO: não execute como root" >&2
  exit 1
fi

APP_NAME="${1:-}"
PORT="${2:-3000}"
if [ -z "$APP_NAME" ]; then
  echo "Uso: $0 <nome_app> [porta]" >&2
  exit 1
fi

URL="http://localhost:${PORT}/health"
LAST_ALERT_FILE="/tmp/hub_sentinel_last_alert_${APP_NAME}"
NOW=$(date +%s)

function send_alert() {
  local message="$1"
  # Primeiro tenta pelo comando do MoltBot, se existir
  if command -v moltbot >/dev/null 2>&1; then
    moltbot message --channel telegram --target "@lucas" --message "$message" || true
  fi
  # Fallback: usa Telegram API se variáveis estiverem definidas
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d chat_id="${TELEGRAM_CHAT_ID}" \
      -d text="$message" >/dev/null || true
  fi
  echo "$NOW" > "$LAST_ALERT_FILE"
}

# Verifica se circuito está aberto (backoff)
if [ -f "$LAST_ALERT_FILE" ]; then
  LAST=$(cat "$LAST_ALERT_FILE")
  DIFF=$((NOW - LAST))
  # Se último alerta foi há menos de 5 minutos, não alerta novamente
  if [ $DIFF -lt 300 ]; then
    exit 0
  fi
fi

STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || true)
if [ "$STATUS_CODE" != "200" ]; then
  send_alert "🚨 ALERTA: $APP_NAME down (HTTP $STATUS_CODE). Verifique o serviço na porta $PORT."
  exit 1
fi

exit 0

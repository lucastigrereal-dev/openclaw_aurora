#!/usr/bin/env bash
set -euo pipefail

# Bombeiro tenta recuperar um serviço se a sentinela detectar falha.
# Uso: bombeiro.sh <nome_app>

if [ "$EUID" -eq 0 ]; then
  echo "ERRO: não execute como root" >&2
  exit 1
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "Uso: $0 <nome_app>" >&2
  exit 1
fi

# Tenta restart via docker se o contêiner existir
if docker ps --format '{{.Names}}' | grep -q "${APP_NAME}_container"; then
  echo "🔄 Reiniciando contêiner ${APP_NAME}_container..."
  if docker restart "${APP_NAME}_container"; then
    echo "✅ Contêiner reiniciado"
    exit 0
  fi
fi

# Caso não exista contêiner, tenta matar e reiniciar processo Node (ad hoc)
PIDS=$(pgrep -f "${APP_NAME}/src/server.js" || true)
if [ -n "$PIDS" ]; then
  echo "🔪 Finalizando processo Node..."
  kill $PIDS || true
fi
# Reiniciar manualmente: supõe que npm está instalado
APP_DIR="$HOME/.moltbot/hub/apps/$APP_NAME"
if [ -d "$APP_DIR" ]; then
  (cd "$APP_DIR" && PORT=$(grep -oE "[0-9]{4}:[0-9]{4}" deploy/docker-compose.yml | cut -d: -f1) npm start &> "$APP_DIR/logs/restart.log" &)
  echo "✅ Processo Node reiniciado em background"
  exit 0
fi

# Se nada deu certo
echo "❌ Não foi possível reiniciar $APP_NAME. Ação manual necessária."
exit 1

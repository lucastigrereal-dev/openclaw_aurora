#!/usr/bin/env bash
set -euo pipefail

# Não rode como root
if [ "$EUID" -eq 0 ]; then
  echo "ERRO: não rode como root" >&2
  exit 1
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "Uso: $0 <nome_do_app>" >&2
  exit 1
fi

SCRIPT_DIR="$( cd -- "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
HUB_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
APP_DIR="$HUB_ROOT/apps/$APP_NAME"

if [ ! -d "$APP_DIR" ]; then
  echo "Aplicativo $APP_NAME não encontrado em $APP_DIR" >&2
  exit 1
fi

# Determina a porta no docker-compose (linha com ports: "host:container")
if [ -f "$APP_DIR/deploy/docker-compose.yml" ]; then
  PORT=$(grep -oE "[0-9]{4}:[0-9]{4}" "$APP_DIR/deploy/docker-compose.yml" | head -n1 | cut -d: -f1)
else
  PORT=3000
fi

# Roda dependências do projeto
(cd "$APP_DIR" && npm install --silent)

# Roda servidor em background
(node "$APP_DIR/src/server.js" &> "$APP_DIR/logs/smoke_server.log" &)
SERVER_PID=$!
sleep 2

FAILED=0

# Teste 1: health endpoint
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/health" | grep -q 200; then
  echo "Health OK"
else
  echo "Health falhou" >&2
  FAILED=1
fi

# Teste 2: rodar testes npm
test_output=$(cd "$APP_DIR" && npm test 2>&1)
if echo "$test_output" | grep -iq "Todos os testes passaram"; then
  echo "Testes npm OK"
else
  echo "Testes npm falharam" >&2
  echo "$test_output" > "$APP_DIR/logs/test_output.log"
  FAILED=1
fi

# Finaliza servidor
kill $SERVER_PID || true

if [ "$FAILED" -eq 1 ]; then
  echo "Algum teste falhou. Bloqueando deploy." >&2
  echo "Falha nos testes" > "$APP_DIR/BLOCKED"
  exit 1
fi

# Remove bloqueio se existir
[ -f "$APP_DIR/BLOCKED" ] && rm "$APP_DIR/BLOCKED"

echo "Todos os smoke tests passaram"

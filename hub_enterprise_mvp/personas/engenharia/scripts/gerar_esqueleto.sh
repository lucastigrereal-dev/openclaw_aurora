#!/usr/bin/env bash
set -euo pipefail

# Este script gera a estrutura básica de um app enterprise.
# Uso: ./gerar_esqueleto.sh <nome_do_app>

# Verifica que não está rodando como root
if [ "$EUID" -eq 0 ]; then
  echo "ERRO: não execute como root!" >&2
  exit 1
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
  echo "Uso: $0 <nome_do_app>" >&2
  exit 1
fi
# Valida nome: letras, números, _ e -
if [[ ! "$APP_NAME" =~ ^[a-z0-9_-]+$ ]]; then
  echo "Nome de app inválido. Use apenas a-z, 0-9, _ ou -." >&2
  exit 1
fi

# Define diretórios
SCRIPT_DIR="$( cd -- "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
HUB_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
APPS_ROOT="$HUB_ROOT/apps"

mkdir -p "$APPS_ROOT"
APP_DIR="$APPS_ROOT/$APP_NAME"

# Idempotência: se já existe, não recria
if [ -d "$APP_DIR" ]; then
  echo "App $APP_NAME já existe em $APP_DIR. Ignorando criação."
  exit 0
fi

mkdir -p "$APP_DIR/src" "$APP_DIR/tests" "$APP_DIR/config" "$APP_DIR/deploy" "$APP_DIR/logs"

# Gera porta dinâmica a partir de hash do nome
BASE_PORT=3000
HASH=$(echo -n "$APP_NAME" | cksum | awk '{print $1}')
PORT=$((BASE_PORT + HASH % 1000))

# Cria server.js
cat > "$APP_DIR/src/server.js" <<JS
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || $PORT;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
JS

# Cria testes de fumaça
cat > "$APP_DIR/tests/smoke.test.js" <<'TEST'
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

test('health endpoint deve retornar status 200', async () => {
  const res = await fetch(`http://localhost:${process.env.PORT || '$PORT'}/health`);
  if (res.status !== 200) {
    throw new Error(`Health retornou ${res.status}`);
  }
});
TEST

# Cria package.json
cat > "$APP_DIR/package.json" <<JSON
{
  "name": "$APP_NAME",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "node src/server.js",
    "test": "node tests/smoke.test.js"
  },
  "dependencies": {
    "express": "4.18.2"
  },
  "devDependencies": {
    "node-fetch": "3.3.2"
  }
}
JSON

# Cria Docker Compose
cat > "$APP_DIR/deploy/docker-compose.yml" <<YAML
version: '3'
services:
  ${APP_NAME}:
    build: .
    container_name: ${APP_NAME}_container
    ports:
      - "$PORT:$PORT"
    environment:
      - PORT=$PORT
    volumes:
      - ./:/app
    command: ["npm", "start"]
YAML

# Cria Dockerfile
cat > "$APP_DIR/deploy/Dockerfile" <<'DOCKER'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
USER node
EXPOSE 3000
CMD ["npm", "start"]
DOCKER

# Cria README
cat > "$APP_DIR/README.md" <<MD
# $APP_NAME

Aplicativo gerado automaticamente pelo Hub Enterprise.

## Como rodar local

```bash
npm install
PORT=$PORT npm start
```

## Testar health

```bash
PORT=$PORT npm test
```

O serviço expõe `GET /health` respondendo `{ status: 'ok' }`.
MD

# Registro básico
mkdir -p "$HUB_ROOT/logs"
echo "$(date -Iseconds) | engenharia | gerar_esqueleto | success | $APP_NAME" >> "$HUB_ROOT/logs/hub_activity.log"

echo "✅ App $APP_NAME criado com sucesso em $APP_DIR (porta $PORT)"

#!/usr/bin/env bash
set -euo pipefail

# Orquestrador simples do Hub Enterprise.
# Exemplo: ./orchestrate.sh "faz o app meuapp"

if [ "$EUID" -eq 0 ]; then
  echo "ERRO: não execute como root" >&2
  exit 1
fi

MSG="$*"
SCRIPT_DIR="$( cd -- "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Classifica intenção usando Node
CLASSIFICATION=$(node "$SCRIPT_DIR/router/intent_classifier.js" "$MSG")
TYPE=$(echo "$CLASSIFICATION" | jq -r '.type')
ACTION=$(echo "$CLASSIFICATION" | jq -r '.action')

case "$ACTION" in
  pipeline_completo)
    # Extrai nome do app do comando (parte depois de 'faz o app')
    APP_NAME=$(echo "$MSG" | sed -E 's/.*faz o app ([a-zA-Z0-9_-]+)/\1/' | tr 'A-Z' 'a-z')
    echo "🟢 Produto definindo MVP para $APP_NAME"
    node "$SCRIPT_DIR/personas/produto/scripts/mvp_definition.js" "$APP_NAME" > /tmp/${APP_NAME}_produto.json
    echo "🛠 Engenharia criando app $APP_NAME"
    bash "$SCRIPT_DIR/personas/engenharia/scripts/gerar_esqueleto.sh" "$APP_NAME"
    echo "🧪 QA executando smoke tests para $APP_NAME"
    bash "$SCRIPT_DIR/personas/qa/scripts/smoke_tests.sh" "$APP_NAME" || { echo "Deploy bloqueado"; exit 1; }
    echo "✅ Pipeline concluído para $APP_NAME"
    ;;
  *)
    echo "Ação $ACTION não implementada neste orquestrador simples."
    ;;
esac

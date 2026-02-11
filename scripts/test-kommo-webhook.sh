#!/bin/bash

# Script de teste para webhooks do Kommo
# Simula diferentes tipos de eventos do Kommo CRM

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:18789/hooks/kommo}"
TOKEN="${KOMMO_WEBHOOK_TOKEN:-kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs}"

echo "================================"
echo "TESTE DE WEBHOOKS KOMMO"
echo "================================"
echo "URL: $WEBHOOK_URL?token=$TOKEN"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar um webhook
test_webhook() {
  local name=$1
  local payload=$2

  echo -e "${YELLOW}Testando: $name${NC}"

  response=$(curl -s -w "\n%{http_code}" -X POST "$WEBHOOK_URL?token=$TOKEN" \
    -H "Content-Type: application/json" \
    -d "$payload")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Sucesso (HTTP $http_code)${NC}"
  else
    echo -e "${RED}✗ Falhou (HTTP $http_code)${NC}"
    echo "Response: $body"
  fi

  echo ""
}

# =======================
# TESTE 1: Novo Lead
# =======================
test_webhook "1. Novo Lead (lead_created)" '{
  "leads": {
    "add": [{
      "id": 99999,
      "name": "João Silva Teste",
      "pipeline_id": 12345678,
      "status_id": 11111111,
      "price": 5000,
      "responsible_user_id": 1,
      "created_at": 1707600000,
      "custom_fields_values": [
        {
          "field_code": "PHONE",
          "values": [{"value": "+5511999999999"}]
        },
        {
          "field_code": "EMAIL",
          "values": [{"value": "joao.teste@gmail.com"}]
        }
      ]
    }]
  }
}'

# =======================
# TESTE 2: Lead Atualizado
# =======================
test_webhook "2. Lead Atualizado (lead_updated)" '{
  "leads": {
    "update": [{
      "id": 99999,
      "name": "João Silva Teste",
      "pipeline_id": 12345678,
      "status_id": 22222222,
      "old_status_id": 11111111,
      "price": 6000,
      "updated_at": 1707603600,
      "custom_fields_values": [
        {
          "field_code": "PHONE",
          "values": [{"value": "+5511999999999"}]
        }
      ]
    }]
  }
}'

# =======================
# TESTE 3: Mudança de Estágio
# =======================
test_webhook "3. Mudança de Estágio (lead_status_changed)" '{
  "leads": {
    "status": [{
      "id": 99999,
      "name": "João Silva Teste",
      "pipeline_id": 12345678,
      "status_id": 33333333,
      "old_status_id": 22222222,
      "updated_at": 1707607200
    }]
  }
}'

# =======================
# TESTE 4: Nova Nota
# =======================
test_webhook "4. Nova Nota/Mensagem (note_added)" '{
  "notes": {
    "add": [{
      "id": 88888,
      "element_id": 99999,
      "element_type": 2,
      "note_type": "common",
      "params": {
        "text": "Quanto custa o procedimento completo?"
      },
      "created_at": 1707610800,
      "created_by": 123
    }]
  }
}'

# =======================
# TESTE 5: Novo Contato
# =======================
test_webhook "5. Novo Contato (contact_created)" '{
  "contacts": {
    "add": [{
      "id": 77777,
      "name": "Maria Santos Teste",
      "first_name": "Maria",
      "last_name": "Santos",
      "created_at": 1707614400,
      "custom_fields_values": [
        {
          "field_code": "PHONE",
          "values": [{"value": "+5511988888888"}]
        },
        {
          "field_code": "EMAIL",
          "values": [{"value": "maria.teste@gmail.com"}]
        }
      ]
    }]
  }
}'

# =======================
# TESTE 6: Contato Atualizado
# =======================
test_webhook "6. Contato Atualizado (contact_updated)" '{
  "contacts": {
    "update": [{
      "id": 77777,
      "name": "Maria Santos Silva",
      "updated_at": 1707618000,
      "custom_fields_values": [
        {
          "field_code": "PHONE",
          "values": [{"value": "+5511988888888"}]
        }
      ]
    }]
  }
}'

# =======================
# TESTE 7: Evento Desconhecido (fallback)
# =======================
test_webhook "7. Evento Desconhecido (fallback)" '{
  "unknown_entity": {
    "something": [{
      "id": 12345
    }]
  }
}'

echo "================================"
echo "TESTES CONCLUÍDOS"
echo "================================"
echo ""
echo "Próximos passos:"
echo "1. Verificar logs: tail -f ~/.openclaw/logs/gateway.log"
echo "2. Verificar Supabase: SELECT * FROM kommo_eventos ORDER BY created_at DESC LIMIT 10"
echo "3. Verificar leads criados: SELECT * FROM kommo_leads WHERE kommo_id = 99999"
echo ""

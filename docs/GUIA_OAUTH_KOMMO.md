# Guia: Configurar OAuth App no Kommo CRM

> **Objetivo**: Criar uma integração OAuth no Kommo para permitir que o OpenClaw Aurora acesse a API do CRM.

---

## Pré-requisitos

- Acesso administrativo ao Kommo (rodovanski.kommo.com)
- URL do Gateway Aurora (local: http://localhost:18789 | produção: https://seu-gateway.railway.app)
- ~15 minutos

---

## PASSO 1: Acessar Painel de Integrações

1. Fazer login no Kommo: https://rodovanski.kommo.com
2. Clicar no ícone de **configurações** (⚙️) no canto superior direito
3. No menu lateral, ir em: **Configurações** → **Integrações**
4. Clicar no botão **"Criar integração"** (ou "Create integration")

---

## PASSO 2: Preencher Dados da Integração

### Nome da Integração
```
OpenClaw Aurora SDR
```

### Descrição (opcional)
```
Agente SDR automatizado para qualificação de leads, integrado com Aurora AI.
```

### Redirect URI
**⚠️ IMPORTANTE**: Este campo deve apontar para o callback endpoint do Aurora.

**Ambiente Local (desenvolvimento):**
```
http://localhost:18789/kommo/callback
```

**Ambiente Produção (Railway):**
```
https://seu-gateway.railway.app/kommo/callback
```
(substituir `seu-gateway.railway.app` pelo domínio real do Railway)

---

## PASSO 3: Configurar Permissões (Scopes)

Marcar as seguintes permissões:

- ✅ **Contacts** — Leitura e Escrita
- ✅ **Leads** — Leitura e Escrita
- ✅ **Tasks** — Leitura e Escrita
- ✅ **Notes** — Leitura e Escrita
- ✅ **Pipelines** — Leitura (opcional, mas recomendado)

**NÃO marcar:**
- ❌ Usuários (Users) — não necessário
- ❌ Configurações (Settings) — não necessário

---

## PASSO 4: Salvar e Anotar Credenciais

Depois de criar a integração, o Kommo vai exibir:

1. **Client ID** (UUID format)
   ```
   Exemplo: 12345678-1234-1234-1234-123456789abc
   ```

2. **Client Secret** (string longa)
   ```
   Exemplo: abcdef1234567890abcdef1234567890
   ```

**⚠️ ATENÇÃO**: O Client Secret é exibido **APENAS UMA VEZ**. Se perder, precisará regenerar.

### Onde anotar:
Copiar e colar no arquivo `.env.kommo`:
```bash
KOMMO_CLIENT_ID=12345678-1234-1234-1234-123456789abc
KOMMO_CLIENT_SECRET=abcdef1234567890abcdef1234567890
```

---

## PASSO 5: Instalar a Integração na Conta

1. Na página da integração criada, clicar no botão **"Instalar"** (ou "Install")
2. O Kommo vai redirecionar para uma tela de autorização
3. Clicar em **"Permitir acesso"** (ou "Allow access")
4. Você será redirecionado de volta para o Redirect URI configurado

**O que acontece aqui:**
- Kommo gera um `authorization_code` temporário (válido por ~5 minutos)
- O Aurora vai trocar esse código por um `access_token` e `refresh_token`

---

## PASSO 6: Capturar Access Token e Refresh Token

### Opção A: Via Interface do Kommo (mais fácil)

Depois de instalar, o Kommo exibe os tokens na interface:

1. Ir em: Configurações → Integrações → sua integração
2. Procurar por **"Token de acesso"** ou **"Access Token"**
3. Copiar o `access_token` e `refresh_token`

**Colar no `.env.kommo`:**
```bash
KOMMO_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ij...
KOMMO_REFRESH_TOKEN=def5020012345abcdef67890...
```

### Opção B: Via Fluxo OAuth Manual (avançado)

Se a opção A não funcionar, usar o fluxo OAuth completo:

1. Construir URL de autorização:
   ```
   https://rodovanski.kommo.com/oauth2/authorize?client_id=SEU_CLIENT_ID&redirect_uri=http://localhost:18789/kommo/callback&response_type=code
   ```

2. Abrir a URL no navegador
3. Autorizar acesso
4. Você será redirecionado para: `http://localhost:18789/kommo/callback?code=AUTHORIZATION_CODE`
5. Copiar o `code` da URL
6. Trocar o código por tokens usando curl:

   ```bash
   curl -X POST https://rodovanski.kommo.com/oauth2/access_token \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "SEU_CLIENT_ID",
       "client_secret": "SEU_CLIENT_SECRET",
       "grant_type": "authorization_code",
       "code": "AUTHORIZATION_CODE",
       "redirect_uri": "http://localhost:18789/kommo/callback"
     }'
   ```

7. Resposta:
   ```json
   {
     "token_type": "Bearer",
     "expires_in": 86400,
     "access_token": "eyJ0eXAi...",
     "refresh_token": "def502..."
   }
   ```

8. Copiar `access_token` e `refresh_token` para `.env.kommo`

---

## PASSO 7: Validar Credenciais

Testar se o access token funciona:

```bash
curl -H "Authorization: Bearer $KOMMO_ACCESS_TOKEN" \
  https://rodovanski.kommo.com/api/v4/account
```

**Resposta esperada:**
```json
{
  "id": 12345678,
  "name": "Instituto Rodovanski",
  "subdomain": "rodovanski",
  ...
}
```

Se retornar erro 401 (Unauthorized), o token está inválido.

---

## PASSO 8: Configurar Webhooks no Kommo

1. No painel da integração, ir na aba **"Webhooks"**
2. Adicionar novo webhook:

   **URL:**
   ```
   https://seu-gateway.railway.app/hooks/kommo?token=kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs
   ```
   (usar o token gerado no arquivo `.env.kommo`)

   **Eventos a marcar:**
   - ✅ `leads.add` (novo lead)
   - ✅ `leads.update` (lead atualizado)
   - ✅ `leads.status` (mudança de estágio)
   - ✅ `notes.add` (nova nota/mensagem)
   - ✅ `contacts.add` (novo contato)
   - ✅ `contacts.update` (contato atualizado)

3. Salvar

---

## PASSO 9: Testar Webhook

1. Criar um lead de teste manualmente no Kommo
2. Verificar se o Aurora recebeu o webhook:
   ```bash
   tail -f ~/.openclaw/logs/gateway.log
   ```

3. Deve aparecer algo como:
   ```
   [hook:kommo-lead-created] Triggered: Novo lead - João Teste
   ```

---

## Troubleshooting

### Erro: "invalid_client"
- Verificar se CLIENT_ID e CLIENT_SECRET estão corretos
- Verificar se a integração está instalada na conta

### Erro: "invalid_grant"
- O authorization_code expirou (válido por 5 min)
- Repetir o fluxo OAuth

### Erro: "unauthorized_client"
- Redirect URI não corresponde ao configurado na integração
- Verificar exatamente a URL (http vs https, porta, path)

### Access token expirou (HTTP 401 após 24h)
- Usar o refresh_token para gerar novo access_token:
  ```bash
  curl -X POST https://rodovanski.kommo.com/oauth2/access_token \
    -H "Content-Type: application/json" \
    -d '{
      "client_id": "SEU_CLIENT_ID",
      "client_secret": "SEU_CLIENT_SECRET",
      "grant_type": "refresh_token",
      "refresh_token": "SEU_REFRESH_TOKEN",
      "redirect_uri": "http://localhost:18789/kommo/callback"
    }'
  ```

---

## Resultado Final

Ao final, você terá no `.env.kommo`:

```bash
KOMMO_DOMAIN=rodovanski
KOMMO_CLIENT_ID=12345678-1234-1234-1234-123456789abc
KOMMO_CLIENT_SECRET=abcdef1234567890abcdef1234567890
KOMMO_ACCESS_TOKEN=eyJ0eXAiOiJKV1Qi...
KOMMO_REFRESH_TOKEN=def5020012345...
KOMMO_WEBHOOK_TOKEN=kRkMC0tsz2vjNzHVLFIuzH_FJGOGOaEqNsRH2relqNs
```

**Próximo passo**: Extrair IDs do pipeline com `node scripts/get-kommo-pipeline-ids.js`

---

**Documentação oficial do Kommo OAuth:**
https://www.amocrm.com/developers/content/oauth/oauth

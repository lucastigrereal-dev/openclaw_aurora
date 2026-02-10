# 🦅 Pegar API Key do Claude (Anthropic)

## ⚡ CONFIGURADO PARA: Claude 3.5 Haiku

**Haiku é o modelo mais rápido e barato!**

- 💰 Custo: ~$0.80 / 1M tokens (mais barato)
- ⚡ Velocidade: Ultra rápido
- 🎯 Qualidade: Ótima para a maioria dos casos

---

## 📝 PASSO A PASSO:

### 1. Criar Conta no Anthropic

**Acesse:** https://console.anthropic.com

- Clique em "Sign Up" se não tiver conta
- Ou "Sign In" se já tiver

### 2. Adicionar Créditos

⚠️ **IMPORTANTE**: Precisa ter créditos para usar!

1. Vá em: **Settings** → **Billing**
2. Clique em: **Add Credits**
3. Adicione pelo menos: **$5** (recomendado: $10)

**Preços:**
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

**Exemplo de uso:**
- $5 = ~6.25M tokens input (~4M palavras)
- Milhares de conversas!

### 3. Criar API Key

1. Vá em: **API Keys**
2. Clique: **Create Key**
3. Dê um nome: `OpenClaw Aurora`
4. **COPIE A KEY** (só mostra uma vez!)

A key vai parecer:
```
sk-ant-api03-ABC123...XYZ
```

### 4. Configurar no .env

Abra o arquivo `.env` e substitua:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-SUA_KEY_AQUI
CLAUDE_MODEL=claude-3-5-haiku-20241022
```

**Exemplo:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-ABC123defGHI456jklMNO789pqrSTU
CLAUDE_MODEL=claude-3-5-haiku-20241022
```

### 5. Reiniciar Sistema

```bash
Ctrl+C  # Parar sistema atual

START-AURORA.bat  # Iniciar novamente
```

### 6. Testar no Telegram

```bash
/ask olá Claude, você está funcionando?
```

---

## 💰 CUSTOS (Haiku):

### Por 1000 mensagens (~1500 tokens cada):
- Input: $1.20
- Output: $6.00
- **Total: ~$7.20**

### Comparação:

| Modelo | Custo/1M tokens | Velocidade | Qualidade |
|--------|----------------|------------|-----------|
| **Haiku** | $0.80 | ⚡⚡⚡ Muito Rápido | ⭐⭐⭐⭐ Ótimo |
| Sonnet | $3.00 | ⚡⚡ Rápido | ⭐⭐⭐⭐⭐ Excelente |
| Opus | $15.00 | ⚡ Normal | ⭐⭐⭐⭐⭐ Melhor |

**Haiku é perfeito para:**
- Chat rápido
- Respostas curtas
- Tarefas simples
- Usar muito sem gastar

---

## 🎯 COMANDOS NO TELEGRAM:

### Usar Claude (Haiku):
```
/ask qual a capital do Brasil?
/ask escreva um haiku sobre programação
/ask me ajude com este código Python
```

### Ver status:
```
/status    # Ver sistema
/skills    # Ver todas as skills
```

---

## 🔧 TROUBLESHOOTING:

### ❌ "Invalid API key"
- Verificar se copiou corretamente
- Verificar se tem créditos na conta
- Reiniciar sistema

### ❌ "Insufficient credits"
- Adicionar créditos: https://console.anthropic.com
- Mínimo: $5

### ❌ Bot não responde
- Verificar se sistema está rodando
- Ver logs no console
- Tentar `/status` primeiro

---

## 📊 MONITORAR GASTOS:

### No Anthropic Console:
1. Acesse: https://console.anthropic.com
2. Vá em: **Settings** → **Usage**
3. Veja gasto em tempo real

### No Telegram:
```
/status  # Ver quantas execuções foram feitas
```

---

## 💡 DICAS:

### Economizar:
- Use Haiku (já configurado!)
- Seja objetivo nas perguntas
- Evite conversas muito longas

### Aproveitar mais:
- Haiku é MUITO rápido
- Ótimo para desenvolvimento
- Respostas de qualidade
- Custo baixo

---

## 🆓 ALTERNATIVA GRÁTIS:

Se não quiser gastar, use **Ollama** (já configurado):

```bash
# No Telegram:
/skill ai-ollama sua pergunta aqui

# Ou configure no código para usar Ollama no /ask
```

---

## ✅ PRÓXIMOS PASSOS:

1. ✅ Modelo configurado: **Claude 3.5 Haiku**
2. ⏳ Pegar API Key: https://console.anthropic.com
3. ⏳ Adicionar créditos: Mínimo $5
4. ⏳ Copiar key para .env
5. ⏳ Reiniciar sistema
6. ⏳ Testar: `/ask olá!`

---

**Link direto:** https://console.anthropic.com/settings/keys

**Está pronto para configurar? Cole aqui a API key quando pegar!** 🚀

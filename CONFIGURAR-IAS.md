# 🤖 Configurar IAs - Guia Completo

## 🦅 CLAUDE (Anthropic)

### Passo 1: Obter API Key

1. Acesse: https://console.anthropic.com
2. Faça login ou crie conta
3. Vá em: API Keys
4. Clique: Create Key
5. Copie a key (começa com `sk-ant-api03-...`)

### Passo 2: Configurar no .env

Abra o arquivo `.env` e substitua:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-SUA_KEY_AQUI
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

### Passo 3: Reiniciar sistema

```bash
Ctrl+C (parar)
START-AURORA.bat (iniciar)
```

### Passo 4: Testar

```bash
/skill ai-claude olá, como você está?
```

---

## 🧠 GPT (OpenAI)

### Passo 1: Obter API Key

1. Acesse: https://platform.openai.com
2. Faça login ou crie conta
3. Vá em: API Keys
4. Clique: Create new secret key
5. Copie a key (começa com `sk-...`)

### Passo 2: Configurar no .env

```bash
OPENAI_API_KEY=sk-SUA_KEY_AQUI
OPENAI_MODEL=gpt-4
```

### Passo 3: Reiniciar e testar

```bash
/skill ai-gpt qual a capital do Brasil?
```

---

## 💻 OLLAMA (Local - Já Configurado!)

### Status Atual:
```
✅ OLLAMA_ENABLED=true
✅ OLLAMA_URL=http://172.28.240.1:11434
✅ OLLAMA_MODEL=qwen2.5-coder:7b
```

### Como Usar:

```bash
/skill ai-ollama escreva código Python para hello world
```

### Modelos Disponíveis no Ollama:

- `qwen2.5-coder:7b` (atual) - Código
- `llama3` - Geral
- `mistral` - Rápido
- `codellama` - Código
- `phi` - Leve e rápido

### Trocar Modelo:

No `.env`:
```bash
OLLAMA_MODEL=llama3
```

---

## 🆚 COMPARAÇÃO:

| Recurso | Claude | GPT | Ollama |
|---------|--------|-----|--------|
| **Custo** | Pago | Pago | Grátis |
| **Privacidade** | Cloud | Cloud | 100% Local |
| **Velocidade** | Média | Rápida | Muito Rápida |
| **Qualidade** | Excelente | Excelente | Boa |
| **Código** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Texto** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Limite** | Por uso | Por uso | Ilimitado |

---

## 💰 CUSTOS:

### Claude (Anthropic):
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens
- ~1000 palavras = ~1500 tokens

### GPT-4 (OpenAI):
- Input: $10 / 1M tokens
- Output: $30 / 1M tokens

### Ollama:
- **GRÁTIS** (roda no seu PC)

---

## 🎯 RECOMENDAÇÃO:

### Para começar:
✅ Use **Ollama** (já configurado, grátis)

### Para melhor qualidade:
✅ Configure **Claude** (melhor para código)

### Para criatividade:
✅ Configure **GPT-4** (mais criativo)

---

## ⚡ USO NO TELEGRAM:

### Comando /chat (usa IA padrão):
```
/chat sua pergunta aqui
```

### Comando /skill (escolhe qual IA):
```
/skill ai-ollama sua pergunta
/skill ai-claude sua pergunta
/skill ai-gpt sua pergunta
```

---

## 🔧 TROUBLESHOOTING:

### ❌ "API key inválida"
- Verificar se copiou corretamente
- Verificar se tem créditos (Claude/GPT)
- Reiniciar sistema

### ❌ "Ollama not responding"
- Verificar se Ollama está rodando
- `ollama list` para ver modelos
- `ollama serve` para iniciar

### ❌ "Rate limit"
- Aguardar alguns segundos
- Usar outra IA
- Verificar plano da API

---

## 📞 LINKS ÚTEIS:

- Claude API: https://console.anthropic.com
- OpenAI API: https://platform.openai.com
- Ollama: https://ollama.ai
- Modelos Ollama: https://ollama.ai/library

---

**Configurado alguma IA? Reinicie o sistema e teste!** 🚀

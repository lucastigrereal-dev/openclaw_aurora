# ⚡ RESOLVER TUDO AGORA - GUIA SUPER RÁPIDO

## 🎯 3 PASSOS SIMPLES:

---

## ⚡ OPÇÃO 1: AUTOMÁTICA (Mais Fácil)

### Passo 1: Execute o script
```bash
# Duplo clique em:
GET-CHAT-ID.ps1

# Ou no PowerShell:
.\GET-CHAT-ID.ps1
```

### Passo 2: Siga as instruções na tela
- Script vai buscar seu Chat ID automaticamente
- Vai perguntar se quer configurar
- Digite `S` e pronto!

### Passo 3: Reinicie o sistema
```bash
START-AURORA.bat
```

**✅ PRONTO! Tudo configurado!**

---

## 📱 OPÇÃO 2: MANUAL (5 minutos)

### Passo 1: Descobrir Chat ID

**Método A - Usando @userinfobot (Mais Fácil)**
```
1. Abra o Telegram
2. Busque: @userinfobot
3. Envie: /start
4. Copie o número que aparecer em "Id"
```

**Método B - Usando seu bot**
```
1. Abra o Telegram
2. Busque: @Prometheus_tigre_bot
3. Envie: /start
4. Volte ao console do sistema
5. Veja o número que aparece: "Message from chat: 123456789"
```

**Método C - Usando API no navegador**
```
1. Abra esta URL no navegador:

https://api.telegram.org/bot8017049336:AAFgjCG7s5kq_7OvQ3XrdFwanoow9eYx3lY/getUpdates

2. ANTES, envie /start pro bot no Telegram
3. Procure no JSON: "chat": { "id": 123456789 }
```

### Passo 2: Configurar no .env

Abra o arquivo `.env` e adicione:
```bash
TELEGRAM_CHAT_ID=123456789  # Cole seu número aqui
```

O arquivo completo deve ficar assim:
```bash
TELEGRAM_TOKEN=8017049336:AAFgjCG7s5kq_7OvQ3XrdFwanoow9eYx3lY
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4
OLLAMA_URL=http://172.28.240.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_ENABLED=true
AURORA_PORT=18789

# Admin Chat ID (ADICIONE ESTA LINHA)
TELEGRAM_CHAT_ID=123456789
```

### Passo 3: Reiniciar sistema

```bash
# Feche o sistema (Ctrl+C)
# Depois inicie novamente:
START-AURORA.bat
```

Agora você verá:
```
[Bot] Admin Chat ID: 123456789  ← Configurado!
```

---

## ✅ VERIFICAR SE FUNCIONOU

### No Console:
```
[Bot] Admin Chat ID: 123456789  ← ✅ Funcionou!
```

Se aparecer:
```
[Bot] Admin Chat ID: undefined  ← ❌ Não configurado
```

Repita o Passo 2.

---

## 🧪 TESTAR NO TELEGRAM

### 1. Comandos Básicos
```
/start          # Iniciar bot
/help           # Ver ajuda
/skills         # Listar skills
/status         # Status do sistema
```

### 2. Executar Skill
```
/skill ai-claude olá, como você está?
/skill file-ops read C:\Users\lucas\.env
```

### 3. Chat com IA
```
/chat qual a diferença entre IA e ML?
```

### 4. Comandos Admin
```
/metrics        # Ver métricas
/circuit        # Circuit breakers
/watchdog       # Health checks
```

---

## 🌐 ACESSAR DASHBOARD

### Abrir no Navegador:
```
http://localhost:18789
```

### Conectar WebSocket (Desenvolvimento):
```javascript
const ws = new WebSocket('ws://localhost:18789');

ws.onopen = () => {
  console.log('Conectado!');
};

ws.onmessage = (event) => {
  console.log('Mensagem:', event.data);
};
```

---

## ❓ PROBLEMAS COMUNS

### ❌ Bot não responde
```
1. Verificar se sistema está rodando
2. Verificar token no .env
3. Enviar /start novamente
```

### ❌ "Apenas o admin pode executar"
```
1. Verificar se TELEGRAM_CHAT_ID está no .env
2. Verificar se o número está correto
3. Reiniciar sistema
```

### ❌ Dashboard não carrega
```
1. Verificar se porta 18789 está livre
2. Verificar se sistema está rodando
3. Tentar http://127.0.0.1:18789
```

### ❌ Porta em uso
```
# Matar processos:
cmd //c "taskkill /F /IM node.exe"

# Ou mudar porta no .env:
AURORA_PORT=18790
```

---

## 🎉 RESUMO

1. ⚡ **Execute**: `GET-CHAT-ID.ps1`
2. 📝 **Configure**: TELEGRAM_CHAT_ID no .env
3. 🚀 **Inicie**: `START-AURORA.bat`
4. 📱 **Teste**: Envie `/start` no Telegram
5. 🌐 **Acesse**: http://localhost:18789

**TUDO FUNCIONANDO!** 🎊

---

## 📞 PRECISA DE AJUDA?

Veja os guias detalhados:
- `DESCOBRIR-CHAT-ID.md` - Como descobrir seu Chat ID
- `GUIA-RAPIDO.md` - Comandos e troubleshooting
- `COMECE-AQUI.md` - Guia completo para iniciantes

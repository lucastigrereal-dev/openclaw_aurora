# ⚡ OPENCLAW AURORA - GUIA RÁPIDO DE REFERÊNCIA

## 🚀 INICIAR O SISTEMA

### Windows (Recomendado)
```batch
# Duplo clique em:
START-AURORA.bat            # Sistema completo (recomendado)
START-WEBSOCKET.bat         # Só WebSocket server
START-TELEGRAM.bat          # Só bot Telegram
```

### Terminal/CMD
```bash
# Produção (compilado)
npm start

# Desenvolvimento (hot reload)
npm run dev

# Componentes individuais
npm run bot              # Só Telegram
npm run cli              # Chat CLI interativo
```

---

## 📱 COMANDOS DO TELEGRAM

### Comandos Básicos
```
/start                   # Iniciar bot e ver menu
/help                    # Ajuda completa
/status                  # Status do sistema
/skills                  # Listar todas as skills
```

### Executar Skills
```
/skill <nome> <params>   # Executar uma skill

# Exemplos:
/skill ai-claude escreva sobre IA
/skill file-ops read /caminho/arquivo.txt
/skill analytics-roi calcular vendas
```

### Chat IA
```
/chat <mensagem>         # Conversar com IA
/chat qual é a capital do Brasil?
```

### Administração (Admin apenas)
```
/security                # Ver configurações de segurança
/metrics                 # Ver métricas do sistema
/circuit                 # Status dos circuit breakers
/watchdog                # Status dos watchdogs
```

---

## 🎯 SKILLS DISPONÍVEIS (TOP 15)

| Skill | Categoria | Descrição | Exemplo |
|-------|-----------|-----------|---------|
| **ai-claude** | 🤖 AI | Claude/Anthropic | `/skill ai-claude escrever poema` |
| **ai-gpt** | 🤖 AI | OpenAI GPT | `/skill ai-gpt resumir texto` |
| **ai-ollama** | 🤖 AI | Ollama local | `/skill ai-ollama código python` |
| **autopc-control** | 💻 Sistema | Controle PC | `/skill autopc-control listar processos` |
| **exec-bash** | 💻 Sistema | Comandos bash | `/skill exec-bash ls -la` |
| **file-ops** | 📁 Arquivo | CRUD arquivos | `/skill file-ops read /test.txt` |
| **browser-control** | 🌐 Web | Automação web | `/skill browser-control abrir google.com` |
| **comm-telegram** | 📱 Comm | Enviar msg | `/skill comm-telegram enviar "oi"` |
| **content-ia** | ✍️ Conteúdo | Gerar conteúdo | `/skill content-ia artigo sobre tech` |
| **analytics-roi** | 📊 Analytics | Calcular ROI | `/skill analytics-roi vendas 2025` |
| **marketing-captacao** | 📊 Marketing | Captação leads | `/skill marketing-captacao analisar` |
| **reviews-reputation** | 📊 Marketing | Gestão reviews | `/skill reviews-reputation resumir` |
| **security-config** | 🔒 Segurança | Config segura | `/skill security-config status` |
| **sandbox-runner** | 🧪 Dev | Exec isolada | `/skill sandbox-runner test code` |
| **skill-scaffolder** | 🧪 Dev | Criar skill | `/skill skill-scaffolder new-skill` |

### Ver TODAS as 38+ skills:
```bash
npm run skills:list
```

---

## 🌐 DASHBOARD WEB

### Conectar ao Dashboard

1. **Iniciar sistema**: `START-AURORA.bat`

2. **Acessar**: `http://localhost:18789`
   - Ou conectar WebSocket: `ws://localhost:18789`

3. **Features**:
   - ✅ Monitoramento em tempo real
   - ✅ Executar skills via UI
   - ✅ Ver métricas
   - ✅ Status de circuit breakers
   - ✅ Logs ao vivo

### Eventos WebSocket

```javascript
// Conectar
const ws = new WebSocket('ws://localhost:18789');

// Subscrever eventos
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['skill_execution', 'circuit_breaker', 'watchdog']
}));

// Receber eventos
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

// Executar skill
ws.send(JSON.stringify({
  type: 'execute_skill',
  skill: 'ai-claude',
  params: { prompt: 'Hello' }
}));
```

---

## 🔧 CONFIGURAÇÃO (.env)

### Template Mínimo
```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_CHAT_ID=your_chat_id

# Claude AI (Anthropic)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# OpenAI GPT (opcional)
OPENAI_API_KEY=sk-xxxxx
OPENAI_MODEL=gpt-4

# Ollama Local (opcional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_ENABLED=true

# Aurora Monitor
AURORA_PORT=18789
```

### Obter Tokens

**Telegram Bot**:
1. Fale com @BotFather no Telegram
2. `/newbot` → siga instruções
3. Copie o token

**Claude API**:
- https://console.anthropic.com

**OpenAI API**:
- https://platform.openai.com

---

## 🔍 TROUBLESHOOTING

### Sistema não inicia

```bash
# Verificar dependências
npm install

# Verificar .env
cat .env  # Linux/Mac
type .env  # Windows

# Verificar porta em uso
netstat -ano | findstr :18789  # Windows
lsof -i :18789  # Linux/Mac

# Reconstruir
npm run build
npm start
```

### Telegram não responde

```bash
# 1. Verificar token
echo $TELEGRAM_BOT_TOKEN

# 2. Verificar internet
ping api.telegram.org

# 3. Verificar logs
# Ver console do sistema

# 4. Reiniciar bot
# Ctrl+C e iniciar novamente
```

### Skills falhando

```bash
# Ver status circuit breakers
# No Telegram: /circuit

# Ver métricas
# No Telegram: /metrics

# Testar skill isoladamente
npm test

# Ver logs detalhados
# Console mostra cada execução
```

### Porta 18789 em uso

```bash
# Mudar porta no .env
AURORA_PORT=18790

# Ou matar processo na porta
# Windows:
netstat -ano | findstr :18789
taskkill /PID <pid> /F

# Linux/Mac:
lsof -ti:18789 | xargs kill -9
```

---

## 📊 MONITORAMENTO

### Ver Status em Tempo Real

```bash
# Via Telegram
/status          # Visão geral
/metrics         # Métricas detalhadas
/circuit         # Circuit breakers
/watchdog        # Watchdogs

# Via Dashboard
http://localhost:18789

# Via CLI
npm run cli
> status
```

### Métricas Importantes

| Métrica | O que é | Ideal |
|---------|---------|-------|
| **Success Rate** | % de execuções bem-sucedidas | > 95% |
| **Avg Response Time** | Tempo médio de resposta | < 3s |
| **Circuit Breakers Open** | Quantos estão bloqueando | 0 |
| **Watchdog Alerts** | Alertas de saúde | 0 |
| **Uptime** | Tempo online | - |

---

## 🔐 SEGURANÇA

### Configuração de Admin

```bash
# No .env
TELEGRAM_CHAT_ID=123456789  # Seu chat ID

# Como descobrir seu chat ID:
# 1. Envie mensagem pro bot
# 2. Veja logs do sistema
# 3. Copie o número que aparece
```

### Skills Perigosas (Requerem Aprovação)

- **exec-bash**: Executar comandos do sistema
- **autopc-control**: Controlar PC
- **file-ops** (write/delete): Modificar arquivos
- **browser-control**: Automação de navegador

### Quando pede aprovação:
```
⚠️ ATENÇÃO: Skill Perigosa

Skill: exec-bash
Ação: Executar comando 'rm -rf /tmp/test'
Impacto: Pode deletar arquivos

Deseja executar?
[✅ Sim] [❌ Não]

Timeout: 60 segundos
```

---

## 🧪 DESENVOLVIMENTO

### Criar Nova Skill

```bash
# Usar scaffolder
/skill skill-scaffolder criar minha-skill

# Ou manualmente
cd skills/
cp skill-base.ts minha-skill.ts
# Editar arquivo
```

### Estrutura de Skill

```typescript
export const minhaSkill: SkillDefinition = {
  name: 'minha-skill',
  description: 'O que faz',
  category: 'ai',

  execute: async (context) => {
    // Sua lógica aqui
    return {
      success: true,
      data: 'resultado'
    };
  }
};
```

### Testar Skill

```bash
# Testar todas
npm test

# Testar específica
npm run test -- --skill=minha-skill

# Smoke test
npm run smoke
```

---

## 📦 BUILD & DEPLOY

### Build Local

```bash
# Compilar TypeScript
npm run build

# Verificar dist/
ls dist/

# Executar build
npm start
```

### Deploy Railway

```bash
# Via railway.json (auto-deploy no GitHub push)

# Ou manual:
railway login
railway init
railway up
```

### Deploy Vercel (Dashboard)

```bash
cd dashboard/
vercel --prod
```

---

## 🎯 ATALHOS DE TECLADO (Dashboard)

| Tecla | Ação |
|-------|------|
| `Ctrl+K` | Abrir command palette |
| `Ctrl+/` | Buscar skills |
| `Ctrl+Enter` | Executar skill selecionada |
| `Esc` | Fechar modais |

---

## 📞 SUPORTE

### Documentação Completa
- `ARQUITETURA-COMPLETA.md` - Estrutura completa
- `FLUXOS-VISUAIS.md` - Diagramas de fluxo
- `README.md` - Overview do projeto

### Logs
```bash
# Console output mostra:
✅ Execuções bem-sucedidas
❌ Erros
⚠️ Avisos
📊 Métricas

# Telegram também envia notificações
```

### Debug Mode

```bash
# Ativar logs detalhados
export DEBUG=openclaw:*  # Linux/Mac
set DEBUG=openclaw:*     # Windows CMD

npm run dev
```

---

## 🔄 MANUTENÇÃO

### Atualizar Dependências

```bash
# Verificar atualizações
npm outdated

# Atualizar
npm update

# Ou atualizar tudo
npm install
```

### Backup

```bash
# Fazer backup do .env
cp .env .env.backup

# Fazer backup completo
tar -czf openclaw-backup.tar.gz .
```

### Limpar Cache

```bash
# Limpar node_modules
rm -rf node_modules
npm install

# Limpar build
rm -rf dist
npm run build
```

---

## ⚡ COMANDOS MAIS USADOS

```bash
# Top 5 comandos do dia-a-dia:

1. START-AURORA.bat           # Iniciar tudo
2. /skill ai-claude <prompt>  # Usar IA
3. /status                     # Ver status
4. npm run build              # Recompilar
5. .\FIX-PATHS.ps1            # Fix após mover pasta
```

---

## 🎓 DICAS PRO

### Performance
- Use **Ollama** localmente para IA mais rápida
- **Circuit breakers** protegem de APIs lentas
- **WebSocket** é mais rápido que polling

### Segurança
- Mantenha `.env` privado (não commitar!)
- Use approval para skills perigosas
- Configure rate limits

### Produtividade
- Crie aliases para skills frequentes
- Use dashboard para multi-tasking
- Monitore métricas regularmente

---

**Versão**: 2.0.0
**Última atualização**: 2026-02-10
**Autor**: Lucas Tigre

---

## 📚 LEITURA ADICIONAL

- Para arquitetura detalhada → `ARQUITETURA-COMPLETA.md`
- Para fluxos visuais → `FLUXOS-VISUAIS.md`
- Para criar skills → `/skills/README.md`
- Para API docs → `/docs/API.md`

# 🦅 OpenClaw Aurora v2.0

**Sistema Completo de Automação com 38+ Skills, Proteção contra Falhas e Monitoramento em Tempo Real**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com)

---

## 📋 Índice

- [O que é?](#o-que-é)
- [Features](#features)
- [Início Rápido](#início-rápido)
- [Documentação](#documentação)
- [Skills Disponíveis](#skills-disponíveis)
- [Arquitetura](#arquitetura)
- [Deployment](#deployment)
- [Contribuindo](#contribuindo)

---

## 🎯 O que é?

**OpenClaw Aurora** é um sistema completo de automação e orquestração de tarefas com:

- 🤖 **38+ Skills** prontas para usar (IA, automação, analytics, etc)
- 🔒 **Sistema de Proteção** robusto (circuit breakers, watchdogs)
- 📊 **Monitoramento** em tempo real com métricas
- 📱 **Bot Telegram** completo e interativo
- 🌐 **Dashboard Web** com WebSocket real-time
- 💻 **CLI Interativo** para desenvolvimento
- 🚀 **Deploy Automático** (Railway + Vercel)

### Use Cases

✅ Conversar com IAs (Claude, GPT, Ollama)
✅ Automatizar tarefas do sistema
✅ Controlar navegador (web scraping, automação)
✅ Gerenciar arquivos e processos
✅ Analisar métricas de marketing
✅ Gerar conteúdo automaticamente
✅ Executar comandos bash
✅ Monitorar aplicações

---

## ✨ Features

### 🤖 Inteligência Artificial
- **Claude** (Anthropic) - Melhor para texto e código
- **GPT** (OpenAI) - Versátil e poderoso
- **Ollama** (Local) - Privacidade total, sem custos

### 💻 Automação de Sistema
- Executar comandos bash
- Controlar processos
- Gerenciar arquivos (CRUD completo)
- Automação de tarefas

### 🌐 Automação Web
- Controle de navegador (Puppeteer)
- Web scraping
- Preenchimento automático de formulários
- Screenshots e PDFs

### 📊 Analytics & Marketing
- Análise de ROI
- Captação de leads
- Gestão de reviews e reputação
- Métricas em tempo real

### 🔒 Segurança & Proteção
- **Circuit Breakers** automáticos
- **Watchdog Monitoring** 24/7
- **Aprovação Manual** para ações perigosas
- **Rate Limiting** configurável
- **Sandbox Execution** para isolamento

---

## 🚀 Início Rápido

### 1. Clone o Repositório
```bash
git clone https://github.com/lucastigrereal-dev/openclaw_aurora.git
cd openclaw_aurora
```

### 2. Configure Variáveis de Ambiente
```bash
# Copie o template
cp .env.example .env

# Edite com suas chaves API
# Mínimo necessário:
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx  # Claude (opcional)
OPENAI_API_KEY=sk-xxxxx                # GPT (opcional)
```

### 3. Instale Dependências
```bash
npm install
```

### 4. Inicie o Sistema
```bash
# Windows:
START-AURORA.bat

# Ou via npm:
npm start
```

### 5. Teste!
Envie uma mensagem no Telegram:
```
/start
/skill ai-claude escreva um poema sobre tecnologia
```

**🎉 Sistema funcionando!**

---

## 📚 Documentação

### 📖 Guias Disponíveis

| Documento | Descrição |
|-----------|-----------|
| **[COMECE-AQUI.md](COMECE-AQUI.md)** | 🎯 **COMECE POR AQUI!** Visão geral e início rápido |
| **[GUIA-RAPIDO.md](GUIA-RAPIDO.md)** | ⚡ Referência rápida para uso diário |
| **[ARQUITETURA-COMPLETA.md](ARQUITETURA-COMPLETA.md)** | 🏗️ Estrutura completa do sistema |
| **[FLUXOS-VISUAIS.md](FLUXOS-VISUAIS.md)** | 📊 Diagramas de todos os fluxos |

### 🎓 Por Onde Começar?

```
Iniciante?
  └─► Leia COMECE-AQUI.md

Usando no dia-a-dia?
  └─► Consulte GUIA-RAPIDO.md

Desenvolvendo skills?
  └─► Veja ARQUITETURA-COMPLETA.md

Entendendo internamente?
  └─► Estude FLUXOS-VISUAIS.md
```

---

## 🎯 Skills Disponíveis

### Top 15 Skills

| Skill | Categoria | Descrição |
|-------|-----------|-----------|
| **ai-claude** | 🤖 AI | Claude/Anthropic para texto e código |
| **ai-gpt** | 🤖 AI | OpenAI GPT para tarefas gerais |
| **ai-ollama** | 🤖 AI | Modelos locais (Llama, Qwen, etc) |
| **autopc-control** | 💻 Sistema | Controle total do PC |
| **exec-bash** | 💻 Sistema | Executar comandos bash |
| **exec-extended** | 💻 Sistema | Comandos avançados |
| **browser-control** | 🌐 Web | Automação de navegador |
| **file-ops** | 📁 Arquivo | Operações CRUD de arquivos |
| **file-ops-advanced** | 📁 Arquivo | Operações avançadas |
| **comm-telegram** | 📱 Comm | Enviar mensagens Telegram |
| **content-ia** | ✍️ Conteúdo | Geração de conteúdo com IA |
| **analytics-roi** | 📊 Analytics | Análise de ROI e métricas |
| **marketing-captacao** | 📊 Marketing | Captação de leads |
| **reviews-reputation** | 📊 Marketing | Gestão de reviews |
| **security-config** | 🔒 Segurança | Configuração segura |

### Categorias Completas

- **AI & LLM**: 3 skills (Claude, GPT, Ollama)
- **Sistema**: 3 skills (AutoPC, Bash, Extended)
- **Web & Browser**: 2 skills
- **Arquivos**: 2 skills
- **Comunicação**: 1 skill
- **Marketing & Analytics**: 3 skills
- **Conteúdo**: 1 skill
- **Segurança**: 1 skill
- **Desenvolvimento**: 5 skills
- **Inteligência**: 2 skills

**Total: 38+ skills ativas!**

Ver lista completa:
```bash
npm run skills:list
```

---

## 🏗️ Arquitetura

### Visão Geral

```
┌─────────────────────────────────────────────────────┐
│              INTERFACES                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Telegram │  │WebSocket │  │   CLI    │         │
│  │   Bot    │  │Dashboard │  │  Chat    │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼────────────┼─────────────┼────────────────┘
        │            │             │
┌───────┴────────────┴─────────────┴────────────────┐
│              CORE ENGINE                           │
│  ┌──────────────────────────────────────────┐     │
│  │      Skill Executor (Motor Central)      │     │
│  └─────────┬────────────────────────────────┘     │
│            │                                       │
│  ┌─────────┼──────────────┬──────────────┐        │
│  │         │              │              │        │
│  ▼         ▼              ▼              ▼        │
│ Circuit   Aurora       Security      WebSocket    │
│ Breakers  Monitor      Manager       Bridge       │
└────────────┬──────────────────────────────────────┘
             │
┌────────────┴──────────────────────────────────────┐
│              38+ SKILLS                            │
│  AI • Sistema • Web • Arquivos • Marketing •      │
│  Conteúdo • Segurança • Analytics • Dev           │
└────────────────────────────────────────────────────┘
```

### Stack Tecnológica

- **Runtime**: Node.js 22.x
- **Linguagem**: TypeScript 5.6
- **Bot**: Grammy (Telegram)
- **WebSocket**: ws
- **AI SDKs**: @anthropic-ai/sdk, openai
- **HTTP**: axios
- **Build**: tsc (TypeScript Compiler)
- **Deploy**: Railway (backend) + Vercel (dashboard)

---

## 📱 Uso

### Via Telegram Bot

```
# Comandos básicos
/start                    # Iniciar bot
/help                     # Ver ajuda
/skills                   # Listar skills
/status                   # Status do sistema

# Executar skills
/skill ai-claude escreva sobre IA
/skill file-ops read /arquivo.txt
/skill analytics-roi calcular vendas

# Chat com IA
/chat qual a capital do Brasil?

# Admin
/metrics                  # Ver métricas
/circuit                  # Circuit breakers
/watchdog                 # Health checks
```

### Via Dashboard Web

```bash
# 1. Iniciar sistema
START-AURORA.bat

# 2. Acessar dashboard
http://localhost:18789

# Features:
• Monitoramento em tempo real
• Executar skills via UI
• Ver métricas e logs
• Status de circuit breakers
```

### Via CLI

```bash
npm run cli

# Comandos disponíveis:
> status
> skills
> execute ai-claude "hello"
> metrics
> exit
```

---

## 🔐 Segurança

### Camadas de Proteção

1. **Autenticação**: Somente admin autorizado (Chat ID)
2. **Aprovação Manual**: Skills perigosas requerem confirmação
3. **Circuit Breakers**: Previnem falhas em cascata
4. **Rate Limiting**: Evitam abuso
5. **Sandbox**: Execução isolada
6. **Watchdogs**: Monitoramento 24/7

### Skills que Requerem Aprovação

- `exec-bash` - Executar comandos do sistema
- `autopc-control` - Controlar PC
- `file-ops` (write/delete) - Modificar arquivos
- `browser-control` - Automação de navegador

---

## 📊 Monitoramento

### Métricas Coletadas

- Total de execuções
- Taxa de sucesso/falha
- Tempo médio de resposta
- P50, P95, P99 latency
- Estados de circuit breakers
- Heartbeats e watchdogs
- Mensagens Telegram/WebSocket

### Ver Métricas

```bash
# Via Telegram
/metrics

# Via Dashboard
http://localhost:18789

# Via CLI
npm run cli
> metrics
```

---

## 🚀 Deployment

### Local (Desenvolvimento)

```bash
npm run dev           # Hot reload
npm run build         # Compilar
npm start             # Produção
```

### Railway (Backend)

```bash
# Auto-deploy via GitHub push
# Arquivo: railway.json

# Ou manual:
railway login
railway init
railway up
```

### Vercel (Dashboard)

```bash
cd dashboard/
vercel --prod
```

### Docker

```bash
docker build -t openclaw-aurora .
docker run -p 18789:18789 openclaw-aurora
```

### PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 🧪 Desenvolvimento

### Criar Nova Skill

```bash
# Usar scaffolder
/skill skill-scaffolder criar minha-skill

# Ou manualmente
cd skills/
cp skill-base.ts minha-skill.ts
```

### Estrutura de Skill

```typescript
import { SkillDefinition } from './skill-base';

export const minhaSkill: SkillDefinition = {
  name: 'minha-skill',
  description: 'O que a skill faz',
  category: 'ai',

  requiresApproval: false,
  isDangerous: false,

  execute: async (context) => {
    const { params } = context;

    // Sua lógica aqui
    const result = await minhaFuncao(params);

    return {
      success: true,
      data: result
    };
  }
};
```

### Testar

```bash
npm test                  # Todas as skills
npm run smoke             # Smoke test
npm run smoke:skills      # Contar skills
```

---

## 🛠️ Troubleshooting

### Sistema não inicia

```bash
npm install               # Reinstalar dependências
npm run build             # Recompilar
rm -rf dist && npm start  # Limpar e iniciar
```

### Telegram não responde

```bash
# Verificar token
echo $TELEGRAM_BOT_TOKEN

# Verificar internet
ping api.telegram.org

# Reiniciar
Ctrl+C
START-AURORA.bat
```

### Porta em uso

```bash
# Mudar porta no .env
AURORA_PORT=18790

# Ou matar processo
netstat -ano | findstr :18789
taskkill /PID <pid> /F
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👤 Autor

**Lucas Tigre**

- GitHub: [@lucastigrereal-dev](https://github.com/lucastigrereal-dev)
- Telegram: [@seu_usuario](https://t.me/seu_usuario)

---

## 🌟 Roadmap

### ✅ v2.0 (Atual)
- 38+ skills funcionais
- Circuit breakers
- Watchdog system
- Telegram bot completo
- WebSocket server
- Documentação completa

### 🚧 v2.1 (Em breve)
- Dashboard React avançado
- Multi-user support
- Database integration (PostgreSQL)
- Advanced analytics

### 📋 v3.0 (Planejado)
- Skill marketplace
- Web UI para criar skills
- WhatsApp integration
- Discord integration
- Auto-scaling
- Distributed execution

---

## ⭐ Apoie o Projeto

Se este projeto te ajudou, considere:

- ⭐ Dar uma estrela no GitHub
- 🐛 Reportar bugs
- 💡 Sugerir features
- 🤝 Contribuir com código

---

## 📞 Suporte

- **Documentação**: Veja os arquivos `.md` na raiz do projeto
- **Issues**: [GitHub Issues](https://github.com/lucastigrereal-dev/openclaw_aurora/issues)
- **Telegram**: Entre em contato via bot

---

**🚀 OpenClaw Aurora - Automação Inteligente ao seu alcance!**

---

**Versão**: 2.0.0
**Última atualização**: 2026-02-10
**Status**: ✅ Production Ready

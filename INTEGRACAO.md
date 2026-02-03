# Aurora Monitor - Guia de Integracao com OpenClaw

## O Que E

O **Aurora Monitor** e um sistema de monitoramento, embargo e correcao em tempo real
criado para proteger o OpenClaw (Jarvis) contra crashes e problemas de conexao.

## Componentes

### 1. Aurora Monitor (TypeScript)
Localizado em `aurora-monitor-ts/`

**Protecoes incluidas:**
- **Circuit Breaker**: Abre circuito apos falhas consecutivas, evitando cascata
- **Rate Limiter**: Token Bucket com 25 msg/s global e 1 msg/s por chat
- **Auto-Healer**: Reconexao automatica com backoff exponencial
- **Anomaly Detector**: Detecta spikes, tendencias e memory leaks
- **Process Watchdog**: Monitora heartbeat e reinicia processos travados

### 2. Dashboard (React)
Arquivos em `dashboard/src/`

**Conexao WebSocket:**
- `services/auroraMonitor.ts` - Cliente WebSocket singleton
- `pages/Home.tsx` - Dashboard principal com metricas em tempo real
- `pages/Health.tsx` - Pagina de saude do sistema

## Como Usar

### 1. Compilar Aurora Monitor

```bash
cd aurora-monitor-ts
npm install
npm run build
```

### 2. Iniciar o Monitor

```bash
# Na raiz do projeto
node start-aurora.js

# Ou com porta customizada
node start-aurora.js --port 18800
```

### 3. Conectar o Dashboard

O dashboard se conecta automaticamente ao WebSocket em `ws://localhost:18790`.

Para usar no seu dashboard existente, copie os arquivos:
- `dashboard/src/services/auroraMonitor.ts` para seu projeto
- Importe nas paginas que precisam de metricas

```typescript
import { getAuroraMonitor } from './services/auroraMonitor';

// No componente
useEffect(() => {
  const aurora = getAuroraMonitor();

  aurora.onMetrics((metrics) => {
    console.log('CPU:', metrics.cpu.percent);
    console.log('Memoria:', metrics.memory.percent);
  });

  aurora.connect();

  return () => aurora.disconnect();
}, []);
```

## Integrando com OpenClaw Real

Para integrar com seu OpenClaw real, edite `start-aurora.js` e substitua
os mocks pelos seus servicos reais:

```javascript
// Em vez do mock, use seu bot real
const telegramBot = require('./seu-bot-telegram');

const protectedTelegram = integration.registerChannel({
  name: 'telegram-bot',
  type: 'telegram',
  isConnected: () => telegramBot.isConnected(),
  connect: async () => await telegramBot.start(),
  disconnect: async () => await telegramBot.stop(),
  sendMessage: async (chatId, msg) => await telegramBot.sendMessage(chatId, msg),
});

// Agora use protectedTelegram.execute() para todas as operacoes
await protectedTelegram.execute(async () => {
  await telegramBot.sendMessage(chatId, 'Mensagem protegida!');
});
```

## Protecoes em Acao

### Circuit Breaker
- Apos 5 falhas consecutivas, o circuito **ABRE** (bloqueia chamadas)
- Apos 30 segundos, entra em **HALF-OPEN** (testa uma chamada)
- Se funcionar, **FECHA** (volta ao normal)
- Se falhar, **ABRE** novamente

### Rate Limiter (Telegram)
- **Global**: 25 mensagens/segundo
- **Por Chat**: 1 mensagem/segundo
- Excesso e rejeitado com HTTP 429

### Auto-Healer
- Detecta desconexao
- Tenta reconectar com backoff: 1s, 2s, 4s, 8s... ate 60s max
- Maximo 10 tentativas antes de alertar

## Arquitetura

```
+------------------+     WebSocket      +-------------------+
|                  |  (ws://18790)      |                   |
|  Aurora Monitor  | <----------------> |  Dashboard React  |
|                  |                    |                   |
+--------+---------+                    +-------------------+
         |
         | Protecao
         v
+------------------+
|                  |
|    OpenClaw      |
|  (Telegram, AI)  |
|                  |
+------------------+
```

## Metricas Enviadas via WebSocket

```json
{
  "type": "metrics",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "cpu": { "percent": 45.2 },
    "memory": {
      "percent": 62.1,
      "usedGb": 4.97,
      "totalGb": 8.0,
      "heapUsed": 52428800,
      "heapTotal": 104857600
    },
    "disk": {
      "percent": 71.3,
      "usedGb": 182.5,
      "totalGb": 256.0
    },
    "channels": [
      {
        "name": "telegram-bot",
        "circuitState": "closed",
        "requestCount": 1234
      }
    ],
    "circuitBreakers": [
      {
        "name": "claude-api",
        "state": "closed",
        "failures": 0,
        "successes": 100
      }
    ]
  }
}
```

## Alertas

Alertas sao enviados automaticamente quando:
- CPU > 80%
- Memoria > 85%
- Disco > 90%
- Circuit Breaker abre
- Reconexao falha 5+ vezes

## Comandos Uteis

```bash
# Testar Aurora Monitor
cd aurora-monitor-ts
node test-quick.js

# Ver status do sistema
node start-aurora.js
# (mostra status a cada 10 segundos)
```

## Proximos Passos

1. Substitua os mocks por seus servicos reais
2. Configure alertas para Slack/Discord se desejar
3. Ajuste os thresholds no `aurora-monitor-ts/src/core/config.ts`
4. Integre com seu CI/CD para deploy automatico

---

Criado para o projeto OpenClaw (Jarvis)
Aurora Monitor v1.0.0

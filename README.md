# Aurora Monitor

**Sistema de Monitoramento, Embargo e Correção em Tempo Real para Prevenção de Crashes**

Aurora Monitor é um framework Python completo para monitoramento de aplicações em tempo real, com capacidades de auto-healing e proteção contra falhas.

## Características

- **Coleta de Métricas**: CPU, memória, disco, rede, GC, threads
- **Detecção de Anomalias**: Algoritmos estatísticos para identificar padrões problemáticos
- **Circuit Breaker**: Proteção contra falhas em cascata
- **Rate Limiter**: Controle de taxa de requisições (Token Bucket)
- **Auto-Healing**: Correção automática de problemas detectados
- **Watchdog**: Monitoramento de processos e detecção de deadlocks
- **Alertas**: Notificações via Slack, Email, Webhooks
- **Dashboard**: Interface web para visualização em tempo real
- **Logging Estruturado**: Logs em formato JSON com contexto

## Instalação

```bash
# Instalação básica
pip install aurora-monitor

# Com suporte completo (psutil para métricas detalhadas)
pip install aurora-monitor[full]

# Para desenvolvimento
pip install aurora-monitor[dev]
```

## Uso Rápido

```python
from aurora_monitor import AuroraMonitor, MonitorConfig

# Configuração
config = MonitorConfig(
    app_name="minha-aplicacao",
    environment="production",
)

# Inicializa e inicia o monitor
monitor = AuroraMonitor(config)
monitor.start()

# Registra health checks
monitor.register_health_check("database", lambda: check_db_connection())
monitor.register_health_check("redis", lambda: check_redis())

# Cria circuit breaker para API externa
api_cb = monitor.create_circuit_breaker("api-externa", failure_threshold=3)

@api_cb
def call_external_api():
    return requests.get("https://api.exemplo.com/data")

# Cria rate limiter
rate_limiter = monitor.create_rate_limiter("api", requests_per_second=100)

# Usa no código
try:
    result = call_external_api()
except CircuitBreakerError as e:
    # Circuito aberto, use cache ou fallback
    result = get_cached_data()

# Para o monitor ao encerrar
monitor.stop()
```

## Componentes

### 1. Coletor de Métricas

```python
from aurora_monitor.collectors import MetricsCollector

collector = MetricsCollector()
metrics = collector.collect()

print(f"CPU: {metrics.cpu_percent}%")
print(f"Memória: {metrics.memory_percent}%")
print(f"Disco: {metrics.disk_percent}%")
```

### 2. Detector de Anomalias

```python
from aurora_monitor.detectors import AnomalyDetector

detector = AnomalyDetector()

# Alimenta com métricas
for metrics in metrics_stream:
    detector.add_sample(metrics)

    anomalies = detector.detect()
    for anomaly in anomalies:
        print(f"Anomalia detectada: {anomaly}")
```

### 3. Circuit Breaker

```python
from aurora_monitor.protection import CircuitBreaker

cb = CircuitBreaker(
    name="api-pagamento",
    failure_threshold=5,
    timeout=30.0,
    fallback=lambda: {"status": "cached"}
)

@cb
def processar_pagamento(dados):
    return api_pagamento.processar(dados)

# Ou com context manager
with cb:
    resultado = api_externa.consultar()
```

### 4. Rate Limiter

```python
from aurora_monitor.protection import RateLimiter

limiter = RateLimiter(
    name="api-publica",
    rate=100,  # requisições por segundo
    burst=150,
    per_client_rate=10,
)

@limiter
def handle_request():
    return process_request()

# Com identificação de cliente
if limiter.acquire(client_id="user123"):
    process_request()
else:
    return "Rate limit exceeded", 429
```

### 5. Auto-Healer

```python
from aurora_monitor.healing import AutoHealer

healer = AutoHealer()

# Registra cache para limpeza automática
healer.register_cache(my_lru_cache)

# Registra handler customizado
healer.register_handler(
    HealingActionType.CUSTOM,
    lambda: restart_connection_pool()
)

# Callback quando healing é executado
healer.on_heal(lambda action: print(f"Healing: {action}"))
```

### 6. Watchdog

```python
from aurora_monitor.healing import ProcessWatchdog

watchdog = ProcessWatchdog()
watchdog.start()

# No loop principal
while running:
    watchdog.heartbeat()
    do_work()

# Callback para problemas
watchdog.on_event(lambda event: logger.error(f"Watchdog: {event}"))
```

### 7. Sistema de Alertas

```python
from aurora_monitor.alerts import AlertManager, AlertLevel

alerts = AlertManager()

# Envia alerta
alerts.send(
    level=AlertLevel.WARNING,
    title="Alto uso de memória",
    message="Memória em 85%",
    source="monitor.metrics"
)

# Callback para alertas
alerts.on_alert(lambda a: send_to_pagerduty(a))
```

### 8. Dashboard

```python
from aurora_monitor.dashboard import DashboardServer

dashboard = DashboardServer(monitor)
dashboard.start()  # Inicia em http://localhost:8080
```

## Configuração

### Via código

```python
from aurora_monitor import MonitorConfig, MetricsConfig, CircuitBreakerConfig

config = MonitorConfig(
    app_name="minha-app",
    environment="production",
    metrics=MetricsConfig(
        cpu_threshold=80.0,
        memory_threshold=85.0,
        collection_interval=5.0,
    ),
    circuit_breaker=CircuitBreakerConfig(
        failure_threshold=5,
        timeout=30.0,
    ),
)
```

### Via arquivo JSON

```json
{
  "app_name": "minha-app",
  "environment": "production",
  "metrics": {
    "cpu_threshold": 80.0,
    "memory_threshold": 85.0
  },
  "alerts": {
    "slack_enabled": true,
    "slack_webhook_url": "https://hooks.slack.com/..."
  }
}
```

```python
config = MonitorConfig.from_file("config.json")
```

### Via variáveis de ambiente

```bash
export AURORA_APP_NAME=minha-app
export AURORA_CPU_THRESHOLD=80
export AURORA_SLACK_WEBHOOK=https://hooks.slack.com/...
```

```python
config = MonitorConfig.from_env()
```

## Integração com Frameworks

### Flask

```python
from flask import Flask
from aurora_monitor import AuroraMonitor

app = Flask(__name__)
monitor = AuroraMonitor()

@app.before_first_request
def start_monitor():
    monitor.start()

@app.teardown_appcontext
def stop_monitor(error):
    monitor.stop()

@app.route("/health")
def health():
    results = monitor.run_health_checks()
    return {"healthy": all(results.values()), "checks": results}
```

### FastAPI

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from aurora_monitor import AuroraMonitor

monitor = AuroraMonitor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor.start()
    yield
    monitor.stop()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return monitor.run_health_checks()
```

## Métricas Expostas

O Aurora Monitor coleta automaticamente:

| Métrica | Descrição |
|---------|-----------|
| `cpu_percent` | Uso de CPU em porcentagem |
| `memory_percent` | Uso de memória em porcentagem |
| `disk_percent` | Uso de disco em porcentagem |
| `network_bytes_sent` | Bytes enviados pela rede |
| `network_bytes_recv` | Bytes recebidos pela rede |
| `process_threads` | Número de threads do processo |
| `gc_collections` | Número de coletas do GC |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Aurora Monitor                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Metrics    │  │   Anomaly    │  │    Alert     │          │
│  │  Collector   │──▶│  Detector    │──▶│   Manager    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                  │                  │
│         ▼                 ▼                  ▼                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │ Auto-Healer  │  │   Watchdog   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Circuit    │  │    Rate      │   Protection Layer          │
│  │   Breaker    │  │   Limiter    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## Contribuindo

Contribuições são bem-vindas! Por favor, leia [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

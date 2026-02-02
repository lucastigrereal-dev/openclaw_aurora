"""
Aurora Monitor - Sistema de Monitoramento, Embargo e Correção em Tempo Real
============================================================================

Um framework completo para prevenção de crashes em aplicações Python.

Componentes principais:
- MetricsCollector: Coleta métricas de sistema (CPU, memória, disco, rede)
- AnomalyDetector: Detecta anomalias e padrões problemáticos
- CircuitBreaker: Protege contra falhas em cascata
- AutoHealer: Correção automática de problemas
- RateLimiter: Proteção contra sobrecarga
- HealthChecker: Verificações de saúde do sistema
- AlertManager: Sistema de alertas e notificações
- ProcessWatchdog: Monitoramento de processos

Uso básico:
    from aurora_monitor import AuroraMonitor

    monitor = AuroraMonitor()
    monitor.start()

    # Sua aplicação aqui

    monitor.stop()
"""

__version__ = "1.0.0"
__author__ = "OpenClaw Aurora Team"

from aurora_monitor.core.monitor import AuroraMonitor
from aurora_monitor.core.config import MonitorConfig
from aurora_monitor.collectors.metrics import MetricsCollector
from aurora_monitor.collectors.system import SystemMetrics
from aurora_monitor.detectors.anomaly import AnomalyDetector
from aurora_monitor.protection.circuit_breaker import CircuitBreaker, CircuitState
from aurora_monitor.protection.rate_limiter import RateLimiter, RateLimitExceeded
from aurora_monitor.healing.auto_healer import AutoHealer, HealingAction
from aurora_monitor.healing.watchdog import ProcessWatchdog
from aurora_monitor.alerts.alert_manager import AlertManager, AlertLevel, Alert
from aurora_monitor.utils.logger import AuroraLogger

__all__ = [
    # Core
    "AuroraMonitor",
    "MonitorConfig",

    # Collectors
    "MetricsCollector",
    "SystemMetrics",

    # Detectors
    "AnomalyDetector",

    # Protection
    "CircuitBreaker",
    "CircuitState",
    "RateLimiter",
    "RateLimitExceeded",

    # Healing
    "AutoHealer",
    "HealingAction",
    "ProcessWatchdog",

    # Alerts
    "AlertManager",
    "AlertLevel",
    "Alert",

    # Utils
    "AuroraLogger",
]

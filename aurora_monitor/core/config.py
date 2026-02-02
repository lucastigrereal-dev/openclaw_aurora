"""
Configuração central do Aurora Monitor.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum
import json
import os


class LogLevel(Enum):
    """Níveis de log suportados."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class MetricsConfig:
    """Configuração de coleta de métricas."""
    enabled: bool = True
    collection_interval: float = 5.0  # segundos
    cpu_threshold: float = 85.0  # porcentagem
    memory_threshold: float = 85.0  # porcentagem
    disk_threshold: float = 90.0  # porcentagem
    network_error_threshold: int = 100  # erros por minuto
    include_process_metrics: bool = True
    history_size: int = 1000  # número de pontos a manter


@dataclass
class AnomalyConfig:
    """Configuração de detecção de anomalias."""
    enabled: bool = True
    sensitivity: float = 2.0  # desvios padrão
    min_samples: int = 30  # amostras mínimas para baseline
    detection_window: int = 60  # segundos
    spike_threshold: float = 3.0  # multiplicador para spikes
    trend_window: int = 300  # segundos para análise de tendência


@dataclass
class CircuitBreakerConfig:
    """Configuração do circuit breaker."""
    enabled: bool = True
    failure_threshold: int = 5  # falhas para abrir
    success_threshold: int = 3  # sucessos para fechar
    timeout: float = 30.0  # segundos em estado aberto
    half_open_max_calls: int = 3  # chamadas em half-open
    excluded_exceptions: List[str] = field(default_factory=list)


@dataclass
class RateLimiterConfig:
    """Configuração do rate limiter."""
    enabled: bool = True
    requests_per_second: float = 100.0
    burst_size: int = 150
    per_client_limit: bool = True
    client_requests_per_second: float = 10.0
    client_burst_size: int = 20


@dataclass
class AutoHealerConfig:
    """Configuração do auto-healer."""
    enabled: bool = True
    max_heal_attempts: int = 3
    heal_cooldown: float = 60.0  # segundos entre tentativas
    gc_on_memory_pressure: bool = True
    gc_threshold: float = 80.0  # porcentagem de memória
    restart_on_critical: bool = False
    connection_pool_reset: bool = True
    cache_clear_on_memory: bool = True


@dataclass
class WatchdogConfig:
    """Configuração do watchdog de processos."""
    enabled: bool = True
    check_interval: float = 10.0  # segundos
    heartbeat_timeout: float = 30.0  # segundos sem heartbeat
    max_restarts: int = 3
    restart_delay: float = 5.0  # segundos
    monitor_threads: bool = True
    deadlock_detection: bool = True


@dataclass
class AlertConfig:
    """Configuração de alertas."""
    enabled: bool = True
    email_enabled: bool = False
    slack_enabled: bool = False
    webhook_enabled: bool = False
    email_recipients: List[str] = field(default_factory=list)
    slack_webhook_url: str = ""
    custom_webhook_url: str = ""
    alert_cooldown: float = 300.0  # segundos entre alertas iguais
    aggregate_alerts: bool = True
    aggregation_window: float = 60.0  # segundos


@dataclass
class HealthCheckConfig:
    """Configuração de health checks."""
    enabled: bool = True
    check_interval: float = 30.0  # segundos
    timeout: float = 10.0  # segundos por check
    include_dependencies: bool = True
    custom_checks: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DashboardConfig:
    """Configuração do dashboard."""
    enabled: bool = False
    host: str = "0.0.0.0"
    port: int = 8080
    auth_enabled: bool = True
    auth_token: str = ""
    refresh_interval: float = 5.0  # segundos


@dataclass
class MonitorConfig:
    """
    Configuração principal do Aurora Monitor.

    Exemplo de uso:
        config = MonitorConfig(
            app_name="minha-aplicacao",
            metrics=MetricsConfig(cpu_threshold=80.0),
            circuit_breaker=CircuitBreakerConfig(failure_threshold=3)
        )
    """
    # Configuração geral
    app_name: str = "aurora-app"
    environment: str = "development"
    log_level: LogLevel = LogLevel.INFO
    log_file: Optional[str] = None

    # Componentes
    metrics: MetricsConfig = field(default_factory=MetricsConfig)
    anomaly: AnomalyConfig = field(default_factory=AnomalyConfig)
    circuit_breaker: CircuitBreakerConfig = field(default_factory=CircuitBreakerConfig)
    rate_limiter: RateLimiterConfig = field(default_factory=RateLimiterConfig)
    auto_healer: AutoHealerConfig = field(default_factory=AutoHealerConfig)
    watchdog: WatchdogConfig = field(default_factory=WatchdogConfig)
    alerts: AlertConfig = field(default_factory=AlertConfig)
    health_check: HealthCheckConfig = field(default_factory=HealthCheckConfig)
    dashboard: DashboardConfig = field(default_factory=DashboardConfig)

    # Extensões
    custom_config: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_file(cls, path: str) -> "MonitorConfig":
        """Carrega configuração de um arquivo JSON."""
        with open(path, "r") as f:
            data = json.load(f)
        return cls.from_dict(data)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MonitorConfig":
        """Cria configuração a partir de um dicionário."""
        config = cls()

        # Configuração geral
        if "app_name" in data:
            config.app_name = data["app_name"]
        if "environment" in data:
            config.environment = data["environment"]
        if "log_level" in data:
            config.log_level = LogLevel(data["log_level"])
        if "log_file" in data:
            config.log_file = data["log_file"]

        # Componentes
        if "metrics" in data:
            config.metrics = MetricsConfig(**data["metrics"])
        if "anomaly" in data:
            config.anomaly = AnomalyConfig(**data["anomaly"])
        if "circuit_breaker" in data:
            config.circuit_breaker = CircuitBreakerConfig(**data["circuit_breaker"])
        if "rate_limiter" in data:
            config.rate_limiter = RateLimiterConfig(**data["rate_limiter"])
        if "auto_healer" in data:
            config.auto_healer = AutoHealerConfig(**data["auto_healer"])
        if "watchdog" in data:
            config.watchdog = WatchdogConfig(**data["watchdog"])
        if "alerts" in data:
            config.alerts = AlertConfig(**data["alerts"])
        if "health_check" in data:
            config.health_check = HealthCheckConfig(**data["health_check"])
        if "dashboard" in data:
            config.dashboard = DashboardConfig(**data["dashboard"])

        if "custom_config" in data:
            config.custom_config = data["custom_config"]

        return config

    @classmethod
    def from_env(cls) -> "MonitorConfig":
        """Cria configuração a partir de variáveis de ambiente."""
        config = cls()

        # Lê variáveis de ambiente com prefixo AURORA_
        config.app_name = os.getenv("AURORA_APP_NAME", config.app_name)
        config.environment = os.getenv("AURORA_ENVIRONMENT", config.environment)

        if log_level := os.getenv("AURORA_LOG_LEVEL"):
            config.log_level = LogLevel(log_level)

        config.log_file = os.getenv("AURORA_LOG_FILE", config.log_file)

        # Métricas
        if cpu_threshold := os.getenv("AURORA_CPU_THRESHOLD"):
            config.metrics.cpu_threshold = float(cpu_threshold)
        if memory_threshold := os.getenv("AURORA_MEMORY_THRESHOLD"):
            config.metrics.memory_threshold = float(memory_threshold)

        # Circuit Breaker
        if failure_threshold := os.getenv("AURORA_CB_FAILURE_THRESHOLD"):
            config.circuit_breaker.failure_threshold = int(failure_threshold)
        if cb_timeout := os.getenv("AURORA_CB_TIMEOUT"):
            config.circuit_breaker.timeout = float(cb_timeout)

        # Rate Limiter
        if rps := os.getenv("AURORA_RATE_LIMIT_RPS"):
            config.rate_limiter.requests_per_second = float(rps)

        # Alertas
        if email_recipients := os.getenv("AURORA_ALERT_EMAILS"):
            config.alerts.email_recipients = email_recipients.split(",")
            config.alerts.email_enabled = True
        if slack_webhook := os.getenv("AURORA_SLACK_WEBHOOK"):
            config.alerts.slack_webhook_url = slack_webhook
            config.alerts.slack_enabled = True

        return config

    def to_dict(self) -> Dict[str, Any]:
        """Converte configuração para dicionário."""
        return {
            "app_name": self.app_name,
            "environment": self.environment,
            "log_level": self.log_level.value,
            "log_file": self.log_file,
            "metrics": {
                "enabled": self.metrics.enabled,
                "collection_interval": self.metrics.collection_interval,
                "cpu_threshold": self.metrics.cpu_threshold,
                "memory_threshold": self.metrics.memory_threshold,
                "disk_threshold": self.metrics.disk_threshold,
                "network_error_threshold": self.metrics.network_error_threshold,
                "include_process_metrics": self.metrics.include_process_metrics,
                "history_size": self.metrics.history_size,
            },
            "anomaly": {
                "enabled": self.anomaly.enabled,
                "sensitivity": self.anomaly.sensitivity,
                "min_samples": self.anomaly.min_samples,
                "detection_window": self.anomaly.detection_window,
                "spike_threshold": self.anomaly.spike_threshold,
                "trend_window": self.anomaly.trend_window,
            },
            "circuit_breaker": {
                "enabled": self.circuit_breaker.enabled,
                "failure_threshold": self.circuit_breaker.failure_threshold,
                "success_threshold": self.circuit_breaker.success_threshold,
                "timeout": self.circuit_breaker.timeout,
                "half_open_max_calls": self.circuit_breaker.half_open_max_calls,
            },
            "rate_limiter": {
                "enabled": self.rate_limiter.enabled,
                "requests_per_second": self.rate_limiter.requests_per_second,
                "burst_size": self.rate_limiter.burst_size,
                "per_client_limit": self.rate_limiter.per_client_limit,
                "client_requests_per_second": self.rate_limiter.client_requests_per_second,
                "client_burst_size": self.rate_limiter.client_burst_size,
            },
            "auto_healer": {
                "enabled": self.auto_healer.enabled,
                "max_heal_attempts": self.auto_healer.max_heal_attempts,
                "heal_cooldown": self.auto_healer.heal_cooldown,
                "gc_on_memory_pressure": self.auto_healer.gc_on_memory_pressure,
                "gc_threshold": self.auto_healer.gc_threshold,
                "restart_on_critical": self.auto_healer.restart_on_critical,
            },
            "watchdog": {
                "enabled": self.watchdog.enabled,
                "check_interval": self.watchdog.check_interval,
                "heartbeat_timeout": self.watchdog.heartbeat_timeout,
                "max_restarts": self.watchdog.max_restarts,
                "restart_delay": self.watchdog.restart_delay,
                "monitor_threads": self.watchdog.monitor_threads,
                "deadlock_detection": self.watchdog.deadlock_detection,
            },
            "alerts": {
                "enabled": self.alerts.enabled,
                "email_enabled": self.alerts.email_enabled,
                "slack_enabled": self.alerts.slack_enabled,
                "webhook_enabled": self.alerts.webhook_enabled,
                "alert_cooldown": self.alerts.alert_cooldown,
                "aggregate_alerts": self.alerts.aggregate_alerts,
            },
            "health_check": {
                "enabled": self.health_check.enabled,
                "check_interval": self.health_check.check_interval,
                "timeout": self.health_check.timeout,
                "include_dependencies": self.health_check.include_dependencies,
            },
            "dashboard": {
                "enabled": self.dashboard.enabled,
                "host": self.dashboard.host,
                "port": self.dashboard.port,
                "auth_enabled": self.dashboard.auth_enabled,
                "refresh_interval": self.dashboard.refresh_interval,
            },
            "custom_config": self.custom_config,
        }

    def save(self, path: str) -> None:
        """Salva configuração em arquivo JSON."""
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    def validate(self) -> List[str]:
        """Valida a configuração e retorna lista de problemas."""
        issues = []

        # Validações de thresholds
        if not 0 <= self.metrics.cpu_threshold <= 100:
            issues.append("cpu_threshold deve estar entre 0 e 100")
        if not 0 <= self.metrics.memory_threshold <= 100:
            issues.append("memory_threshold deve estar entre 0 e 100")
        if not 0 <= self.metrics.disk_threshold <= 100:
            issues.append("disk_threshold deve estar entre 0 e 100")

        # Validações de intervalos
        if self.metrics.collection_interval < 1:
            issues.append("collection_interval deve ser >= 1 segundo")
        if self.circuit_breaker.timeout < 1:
            issues.append("circuit_breaker.timeout deve ser >= 1 segundo")
        if self.rate_limiter.requests_per_second <= 0:
            issues.append("requests_per_second deve ser > 0")

        # Validações de contadores
        if self.circuit_breaker.failure_threshold < 1:
            issues.append("failure_threshold deve ser >= 1")
        if self.circuit_breaker.success_threshold < 1:
            issues.append("success_threshold deve ser >= 1")

        return issues

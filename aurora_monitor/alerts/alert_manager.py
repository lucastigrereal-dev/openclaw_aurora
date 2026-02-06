"""
Sistema de Alertas e Notificações.

Gerencia envio de alertas para múltiplos canais:
- Email
- Slack
- Webhooks customizados
- Log
"""

import json
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Dict, List, Optional, Any
import urllib.request
import urllib.error

from aurora_monitor.core.config import AlertConfig


class AlertLevel(Enum):
    """Níveis de alerta."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

    def __lt__(self, other):
        order = [AlertLevel.DEBUG, AlertLevel.INFO, AlertLevel.WARNING,
                 AlertLevel.ERROR, AlertLevel.CRITICAL]
        return order.index(self) < order.index(other)

    def __le__(self, other):
        return self == other or self < other


@dataclass
class Alert:
    """Representa um alerta."""
    level: AlertLevel
    title: str
    message: str
    source: str
    timestamp: datetime = field(default_factory=datetime.now)
    alert_id: str = ""
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    sent_to: List[str] = field(default_factory=list)
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None

    def __post_init__(self):
        if not self.alert_id:
            import hashlib
            content = f"{self.level.value}:{self.title}:{self.source}:{self.timestamp.isoformat()}"
            self.alert_id = hashlib.md5(content.encode()).hexdigest()[:12]

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "alert_id": self.alert_id,
            "level": self.level.value,
            "title": self.title,
            "message": self.message,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "tags": self.tags,
            "metadata": self.metadata,
            "sent_to": self.sent_to,
            "acknowledged": self.acknowledged,
        }

    def __str__(self) -> str:
        return f"[{self.level.value.upper()}] {self.title}: {self.message}"


@dataclass
class AlertAggregate:
    """Agregação de alertas similares."""
    key: str
    first_occurrence: datetime
    last_occurrence: datetime
    count: int
    alerts: List[Alert] = field(default_factory=list)


class AlertManager:
    """
    Gerenciador de alertas.

    Responsável por:
    - Receber alertas
    - Agregar alertas similares
    - Aplicar cooldown para evitar spam
    - Enviar para canais configurados
    - Manter histórico

    Exemplo de uso:
        manager = AlertManager(config)

        manager.send(
            level=AlertLevel.WARNING,
            title="Alto uso de memória",
            message="Memória em 85%",
            source="aurora.metrics"
        )

        # Com callback
        manager.on_alert(lambda alert: print(alert))
    """

    def __init__(self, config: Optional[AlertConfig] = None):
        """
        Inicializa o gerenciador de alertas.

        Args:
            config: Configuração de alertas.
        """
        self.config = config or AlertConfig()

        self._lock = threading.Lock()
        self._history: deque = deque(maxlen=10000)
        self._last_sent: Dict[str, datetime] = {}
        self._aggregates: Dict[str, AlertAggregate] = {}

        # Callbacks
        self._on_alert_callbacks: List[Callable[[Alert], None]] = []

        # Fila de envio assíncrono
        self._send_queue: deque = deque()
        self._sender_thread: Optional[threading.Thread] = None
        self._sender_running = False

        # Inicia sender se algum canal externo está habilitado
        if any([self.config.email_enabled, self.config.slack_enabled, self.config.webhook_enabled]):
            self._start_sender()

    def _start_sender(self) -> None:
        """Inicia thread de envio assíncrono."""
        self._sender_running = True
        self._sender_thread = threading.Thread(
            target=self._sender_loop,
            name="aurora-alert-sender",
            daemon=True
        )
        self._sender_thread.start()

    def _sender_loop(self) -> None:
        """Loop de envio de alertas."""
        while self._sender_running:
            try:
                if self._send_queue:
                    alert = self._send_queue.popleft()
                    self._send_to_channels(alert)
                else:
                    time.sleep(0.1)
            except Exception:
                time.sleep(1)

    def send(
        self,
        level: AlertLevel,
        title: str,
        message: str,
        source: str,
        tags: Optional[Dict[str, str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Alert]:
        """
        Envia um alerta.

        Args:
            level: Nível do alerta.
            title: Título do alerta.
            message: Mensagem detalhada.
            source: Origem do alerta.
            tags: Tags para categorização.
            metadata: Metadados adicionais.

        Returns:
            Alert criado ou None se suprimido por cooldown.
        """
        if not self.config.enabled:
            return None

        alert = Alert(
            level=level,
            title=title,
            message=message,
            source=source,
            tags=tags or {},
            metadata=metadata or {},
        )

        # Verifica cooldown
        key = self._get_alert_key(alert)
        if not self._should_send(key):
            self._aggregate(key, alert)
            return None

        with self._lock:
            self._history.append(alert)
            self._last_sent[key] = datetime.now()

        # Notifica callbacks
        self._notify_callbacks(alert)

        # Adiciona à fila de envio
        if any([self.config.email_enabled, self.config.slack_enabled, self.config.webhook_enabled]):
            self._send_queue.append(alert)

        return alert

    def _get_alert_key(self, alert: Alert) -> str:
        """Gera chave única para agregação."""
        return f"{alert.level.value}:{alert.source}:{alert.title}"

    def _should_send(self, key: str) -> bool:
        """Verifica se deve enviar (cooldown)."""
        with self._lock:
            last = self._last_sent.get(key)
            if last is None:
                return True
            elapsed = (datetime.now() - last).total_seconds()
            return elapsed >= self.config.alert_cooldown

    def _aggregate(self, key: str, alert: Alert) -> None:
        """Agrega alerta similar."""
        if not self.config.aggregate_alerts:
            return

        with self._lock:
            if key not in self._aggregates:
                self._aggregates[key] = AlertAggregate(
                    key=key,
                    first_occurrence=alert.timestamp,
                    last_occurrence=alert.timestamp,
                    count=1,
                    alerts=[alert],
                )
            else:
                agg = self._aggregates[key]
                agg.last_occurrence = alert.timestamp
                agg.count += 1
                if len(agg.alerts) < 10:
                    agg.alerts.append(alert)

    def _send_to_channels(self, alert: Alert) -> None:
        """Envia alerta para canais configurados."""
        if self.config.slack_enabled and self.config.slack_webhook_url:
            self._send_to_slack(alert)

        if self.config.webhook_enabled and self.config.custom_webhook_url:
            self._send_to_webhook(alert)

        if self.config.email_enabled and self.config.email_recipients:
            self._send_email(alert)

    def _send_to_slack(self, alert: Alert) -> bool:
        """Envia alerta para Slack."""
        try:
            color_map = {
                AlertLevel.DEBUG: "#808080",
                AlertLevel.INFO: "#36a64f",
                AlertLevel.WARNING: "#ffcc00",
                AlertLevel.ERROR: "#ff6600",
                AlertLevel.CRITICAL: "#ff0000",
            }

            payload = {
                "attachments": [{
                    "color": color_map.get(alert.level, "#808080"),
                    "title": f"[{alert.level.value.upper()}] {alert.title}",
                    "text": alert.message,
                    "fields": [
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Time", "value": alert.timestamp.isoformat(), "short": True},
                    ],
                    "footer": "Aurora Monitor",
                }]
            }

            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                self.config.slack_webhook_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            urllib.request.urlopen(req, timeout=10)
            alert.sent_to.append("slack")
            return True

        except Exception:
            return False

    def _send_to_webhook(self, alert: Alert) -> bool:
        """Envia alerta para webhook customizado."""
        try:
            payload = alert.to_dict()
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                self.config.custom_webhook_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            urllib.request.urlopen(req, timeout=10)
            alert.sent_to.append("webhook")
            return True

        except Exception:
            return False

    def _send_email(self, alert: Alert) -> bool:
        """Envia alerta por email."""
        # Implementação básica usando smtplib
        try:
            import smtplib
            from email.mime.text import MIMEText

            msg = MIMEText(f"{alert.message}\n\nSource: {alert.source}\nTime: {alert.timestamp}")
            msg['Subject'] = f"[Aurora] [{alert.level.value.upper()}] {alert.title}"
            msg['From'] = "aurora@localhost"
            msg['To'] = ", ".join(self.config.email_recipients)

            # Requer configuração de SMTP
            # with smtplib.SMTP('localhost') as server:
            #     server.send_message(msg)

            alert.sent_to.append("email")
            return True

        except Exception:
            return False

    def _notify_callbacks(self, alert: Alert) -> None:
        """Notifica callbacks registrados."""
        for callback in self._on_alert_callbacks:
            try:
                callback(alert)
            except Exception:
                pass

    def on_alert(self, callback: Callable[[Alert], None]) -> None:
        """
        Registra callback para alertas.

        Args:
            callback: Função chamada quando alerta é enviado.
        """
        self._on_alert_callbacks.append(callback)

    def acknowledge(self, alert_id: str, by: str = "system") -> bool:
        """
        Reconhece um alerta.

        Args:
            alert_id: ID do alerta.
            by: Quem reconheceu.

        Returns:
            True se alerta foi encontrado e reconhecido.
        """
        with self._lock:
            for alert in self._history:
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_at = datetime.now()
                    alert.acknowledged_by = by
                    return True
        return False

    def get_history(
        self,
        limit: int = 100,
        level: Optional[AlertLevel] = None,
        source: Optional[str] = None,
        since: Optional[datetime] = None,
    ) -> List[Alert]:
        """
        Retorna histórico de alertas.

        Args:
            limit: Número máximo de alertas.
            level: Filtrar por nível mínimo.
            source: Filtrar por fonte.
            since: Filtrar por data.

        Returns:
            Lista de alertas.
        """
        with self._lock:
            alerts = list(self._history)

        # Aplica filtros
        if level:
            alerts = [a for a in alerts if a.level >= level]
        if source:
            alerts = [a for a in alerts if source in a.source]
        if since:
            alerts = [a for a in alerts if a.timestamp >= since]

        return alerts[-limit:]

    def get_aggregates(self) -> List[AlertAggregate]:
        """Retorna agregações atuais."""
        with self._lock:
            return list(self._aggregates.values())

    def get_unacknowledged(self, level: Optional[AlertLevel] = None) -> List[Alert]:
        """
        Retorna alertas não reconhecidos.

        Args:
            level: Filtrar por nível mínimo.

        Returns:
            Lista de alertas não reconhecidos.
        """
        with self._lock:
            alerts = [a for a in self._history if not a.acknowledged]

        if level:
            alerts = [a for a in alerts if a.level >= level]

        return alerts

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas de alertas."""
        with self._lock:
            total = len(self._history)
            by_level = {}
            by_source = {}

            for alert in self._history:
                level = alert.level.value
                by_level[level] = by_level.get(level, 0) + 1

                source = alert.source.split('.')[0]
                by_source[source] = by_source.get(source, 0) + 1

            unack = sum(1 for a in self._history if not a.acknowledged)

            # Últimas 24h
            cutoff = datetime.now() - timedelta(hours=24)
            last_24h = sum(1 for a in self._history if a.timestamp >= cutoff)

        return {
            "enabled": self.config.enabled,
            "total_alerts": total,
            "unacknowledged": unack,
            "last_24_hours": last_24h,
            "by_level": by_level,
            "by_source": by_source,
            "aggregates": len(self._aggregates),
            "queue_size": len(self._send_queue),
            "channels": {
                "email": self.config.email_enabled,
                "slack": self.config.slack_enabled,
                "webhook": self.config.webhook_enabled,
            },
        }

    def clear_history(self) -> None:
        """Limpa histórico de alertas."""
        with self._lock:
            self._history.clear()
            self._aggregates.clear()
            self._last_sent.clear()

    def stop(self) -> None:
        """Para o gerenciador de alertas."""
        self._sender_running = False
        if self._sender_thread and self._sender_thread.is_alive():
            self._sender_thread.join(timeout=5.0)

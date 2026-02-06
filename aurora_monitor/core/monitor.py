"""
Monitor principal do Aurora - Orquestra todos os componentes.
"""

import asyncio
import threading
import signal
import sys
import atexit
from typing import Dict, Any, Optional, Callable, List
from datetime import datetime
from contextlib import contextmanager
import traceback

from aurora_monitor.core.config import MonitorConfig
from aurora_monitor.collectors.metrics import MetricsCollector
from aurora_monitor.collectors.system import SystemMetrics
from aurora_monitor.detectors.anomaly import AnomalyDetector
from aurora_monitor.protection.circuit_breaker import CircuitBreaker
from aurora_monitor.protection.rate_limiter import RateLimiter
from aurora_monitor.healing.auto_healer import AutoHealer
from aurora_monitor.healing.watchdog import ProcessWatchdog
from aurora_monitor.alerts.alert_manager import AlertManager, AlertLevel
from aurora_monitor.utils.logger import AuroraLogger


class AuroraMonitor:
    """
    Monitor principal que orquestra todos os componentes do sistema.

    O AuroraMonitor é o ponto central de entrada para o sistema de
    monitoramento. Ele coordena:
    - Coleta de métricas
    - Detecção de anomalias
    - Proteção contra falhas (circuit breaker, rate limiter)
    - Auto-healing
    - Alertas
    - Health checks

    Exemplo de uso:
        monitor = AuroraMonitor(config)
        monitor.start()

        # Registrar circuit breaker
        cb = monitor.create_circuit_breaker("api-externa")

        @cb
        def chamar_api():
            return requests.get("https://api.exemplo.com")

        # Registrar health check
        monitor.register_health_check("database", check_db_connection)

        # Parar monitoramento
        monitor.stop()
    """

    _instance: Optional["AuroraMonitor"] = None
    _lock = threading.Lock()

    def __new__(cls, config: Optional[MonitorConfig] = None):
        """Singleton pattern para garantir uma única instância."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: Optional[MonitorConfig] = None):
        """
        Inicializa o monitor.

        Args:
            config: Configuração do monitor. Se não fornecida, usa padrões.
        """
        if self._initialized:
            return

        self.config = config or MonitorConfig()
        self.logger = AuroraLogger(
            name="aurora",
            level=self.config.log_level.value,
            log_file=self.config.log_file
        )

        self._running = False
        self._started_at: Optional[datetime] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._thread: Optional[threading.Thread] = None

        # Componentes
        self._metrics_collector: Optional[MetricsCollector] = None
        self._anomaly_detector: Optional[AnomalyDetector] = None
        self._auto_healer: Optional[AutoHealer] = None
        self._watchdog: Optional[ProcessWatchdog] = None
        self._alert_manager: Optional[AlertManager] = None

        # Registros
        self._circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._rate_limiters: Dict[str, RateLimiter] = {}
        self._health_checks: Dict[str, Callable[[], bool]] = {}
        self._custom_metrics: Dict[str, Any] = {}

        # Callbacks
        self._on_anomaly_callbacks: List[Callable] = []
        self._on_alert_callbacks: List[Callable] = []
        self._on_heal_callbacks: List[Callable] = []

        # Registra handlers de shutdown
        self._setup_signal_handlers()
        atexit.register(self._cleanup)

        self._initialized = True
        self.logger.info(f"Aurora Monitor inicializado para {self.config.app_name}")

    def _setup_signal_handlers(self) -> None:
        """Configura handlers para sinais do sistema."""
        def signal_handler(signum, frame):
            self.logger.warning(f"Sinal {signum} recebido, iniciando shutdown...")
            self.stop()
            sys.exit(0)

        try:
            signal.signal(signal.SIGTERM, signal_handler)
            signal.signal(signal.SIGINT, signal_handler)
        except (ValueError, OSError):
            # Pode falhar em threads não-principais
            pass

    def _cleanup(self) -> None:
        """Limpeza ao encerrar."""
        if self._running:
            self.stop()

    def start(self) -> None:
        """
        Inicia o monitoramento.

        Raises:
            RuntimeError: Se o monitor já estiver em execução.
        """
        if self._running:
            raise RuntimeError("Monitor já está em execução")

        self._running = True
        self._started_at = datetime.now()

        # Inicializa componentes
        self._initialize_components()

        # Inicia loop de eventos em thread separada
        self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
        self._thread.start()

        self.logger.info("Aurora Monitor iniciado")

        # Alerta inicial
        if self._alert_manager:
            self._alert_manager.send(
                level=AlertLevel.INFO,
                title="Monitor Iniciado",
                message=f"Aurora Monitor iniciado para {self.config.app_name}",
                source="aurora.monitor"
            )

    def _initialize_components(self) -> None:
        """Inicializa todos os componentes baseado na configuração."""
        # Metrics Collector
        if self.config.metrics.enabled:
            self._metrics_collector = MetricsCollector(self.config.metrics)
            self.logger.debug("MetricsCollector inicializado")

        # Anomaly Detector
        if self.config.anomaly.enabled:
            self._anomaly_detector = AnomalyDetector(self.config.anomaly)
            self.logger.debug("AnomalyDetector inicializado")

        # Alert Manager
        if self.config.alerts.enabled:
            self._alert_manager = AlertManager(self.config.alerts)
            self.logger.debug("AlertManager inicializado")

        # Auto Healer
        if self.config.auto_healer.enabled:
            self._auto_healer = AutoHealer(
                config=self.config.auto_healer,
                alert_manager=self._alert_manager
            )
            self.logger.debug("AutoHealer inicializado")

        # Watchdog
        if self.config.watchdog.enabled:
            self._watchdog = ProcessWatchdog(
                config=self.config.watchdog,
                alert_manager=self._alert_manager
            )
            self.logger.debug("ProcessWatchdog inicializado")

    def _run_event_loop(self) -> None:
        """Executa o loop de eventos principal."""
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)

        try:
            self._loop.run_until_complete(self._main_loop())
        except Exception as e:
            self.logger.error(f"Erro no loop principal: {e}")
            self.logger.debug(traceback.format_exc())
        finally:
            self._loop.close()

    async def _main_loop(self) -> None:
        """Loop principal de monitoramento."""
        tasks = []

        # Task de coleta de métricas
        if self._metrics_collector:
            tasks.append(asyncio.create_task(self._metrics_loop()))

        # Task de health check
        if self.config.health_check.enabled:
            tasks.append(asyncio.create_task(self._health_check_loop()))

        # Task do watchdog
        if self._watchdog:
            tasks.append(asyncio.create_task(self._watchdog_loop()))

        # Task de processamento de anomalias
        if self._anomaly_detector:
            tasks.append(asyncio.create_task(self._anomaly_loop()))

        # Aguarda todas as tasks
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _metrics_loop(self) -> None:
        """Loop de coleta de métricas."""
        while self._running:
            try:
                metrics = self._metrics_collector.collect()

                # Verifica thresholds
                self._check_thresholds(metrics)

                # Alimenta detector de anomalias
                if self._anomaly_detector:
                    self._anomaly_detector.add_sample(metrics)

                await asyncio.sleep(self.config.metrics.collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Erro na coleta de métricas: {e}")
                await asyncio.sleep(1)

    async def _health_check_loop(self) -> None:
        """Loop de health checks."""
        while self._running:
            try:
                results = self.run_health_checks()

                # Verifica falhas
                failed = [name for name, passed in results.items() if not passed]
                if failed:
                    self.logger.warning(f"Health checks falharam: {failed}")
                    if self._alert_manager:
                        self._alert_manager.send(
                            level=AlertLevel.WARNING,
                            title="Health Check Failed",
                            message=f"Os seguintes health checks falharam: {', '.join(failed)}",
                            source="aurora.health"
                        )

                await asyncio.sleep(self.config.health_check.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Erro no health check: {e}")
                await asyncio.sleep(1)

    async def _watchdog_loop(self) -> None:
        """Loop do watchdog."""
        while self._running:
            try:
                self._watchdog.check()
                await asyncio.sleep(self.config.watchdog.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Erro no watchdog: {e}")
                await asyncio.sleep(1)

    async def _anomaly_loop(self) -> None:
        """Loop de detecção de anomalias."""
        while self._running:
            try:
                anomalies = self._anomaly_detector.detect()

                if anomalies:
                    self.logger.warning(f"Anomalias detectadas: {anomalies}")

                    # Notifica callbacks
                    for callback in self._on_anomaly_callbacks:
                        try:
                            callback(anomalies)
                        except Exception as e:
                            self.logger.error(f"Erro em callback de anomalia: {e}")

                    # Envia alerta
                    if self._alert_manager:
                        self._alert_manager.send(
                            level=AlertLevel.WARNING,
                            title="Anomalias Detectadas",
                            message=f"Detectadas {len(anomalies)} anomalias: {anomalies}",
                            source="aurora.anomaly"
                        )

                    # Tenta auto-healing
                    if self._auto_healer:
                        for anomaly in anomalies:
                            self._auto_healer.heal(anomaly)

                await asyncio.sleep(self.config.anomaly.detection_window / 10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Erro na detecção de anomalias: {e}")
                await asyncio.sleep(1)

    def _check_thresholds(self, metrics: SystemMetrics) -> None:
        """Verifica se métricas excederam thresholds."""
        alerts_to_send = []

        # CPU
        if metrics.cpu_percent > self.config.metrics.cpu_threshold:
            alerts_to_send.append((
                AlertLevel.WARNING,
                "Alto Uso de CPU",
                f"CPU em {metrics.cpu_percent:.1f}% (threshold: {self.config.metrics.cpu_threshold}%)"
            ))
            if self._auto_healer:
                self._auto_healer.handle_cpu_pressure(metrics.cpu_percent)

        # Memória
        if metrics.memory_percent > self.config.metrics.memory_threshold:
            alerts_to_send.append((
                AlertLevel.WARNING,
                "Alto Uso de Memória",
                f"Memória em {metrics.memory_percent:.1f}% (threshold: {self.config.metrics.memory_threshold}%)"
            ))
            if self._auto_healer:
                self._auto_healer.handle_memory_pressure(metrics.memory_percent)

        # Disco
        if metrics.disk_percent > self.config.metrics.disk_threshold:
            alerts_to_send.append((
                AlertLevel.CRITICAL,
                "Disco Quase Cheio",
                f"Disco em {metrics.disk_percent:.1f}% (threshold: {self.config.metrics.disk_threshold}%)"
            ))

        # Envia alertas
        if self._alert_manager:
            for level, title, message in alerts_to_send:
                self._alert_manager.send(
                    level=level,
                    title=title,
                    message=message,
                    source="aurora.metrics"
                )

    def stop(self) -> None:
        """Para o monitoramento."""
        if not self._running:
            return

        self.logger.info("Parando Aurora Monitor...")
        self._running = False

        # Cancela tasks do loop de eventos
        if self._loop and self._loop.is_running():
            for task in asyncio.all_tasks(self._loop):
                task.cancel()

        # Aguarda thread
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)

        # Alerta de shutdown
        if self._alert_manager:
            self._alert_manager.send(
                level=AlertLevel.INFO,
                title="Monitor Parado",
                message=f"Aurora Monitor parado para {self.config.app_name}",
                source="aurora.monitor"
            )

        self.logger.info("Aurora Monitor parado")

    def create_circuit_breaker(
        self,
        name: str,
        failure_threshold: Optional[int] = None,
        success_threshold: Optional[int] = None,
        timeout: Optional[float] = None
    ) -> CircuitBreaker:
        """
        Cria um circuit breaker.

        Args:
            name: Nome identificador do circuit breaker.
            failure_threshold: Número de falhas para abrir o circuito.
            success_threshold: Número de sucessos para fechar o circuito.
            timeout: Tempo em segundos no estado aberto.

        Returns:
            CircuitBreaker configurado.
        """
        cb = CircuitBreaker(
            name=name,
            failure_threshold=failure_threshold or self.config.circuit_breaker.failure_threshold,
            success_threshold=success_threshold or self.config.circuit_breaker.success_threshold,
            timeout=timeout or self.config.circuit_breaker.timeout,
            on_state_change=lambda old, new: self._on_circuit_state_change(name, old, new)
        )
        self._circuit_breakers[name] = cb
        self.logger.debug(f"Circuit breaker '{name}' criado")
        return cb

    def _on_circuit_state_change(self, name: str, old_state, new_state) -> None:
        """Callback para mudança de estado do circuit breaker."""
        self.logger.warning(f"Circuit breaker '{name}': {old_state.value} -> {new_state.value}")

        if self._alert_manager:
            level = AlertLevel.CRITICAL if new_state.value == "OPEN" else AlertLevel.INFO
            self._alert_manager.send(
                level=level,
                title=f"Circuit Breaker: {name}",
                message=f"Estado alterado de {old_state.value} para {new_state.value}",
                source="aurora.circuit_breaker"
            )

    def create_rate_limiter(
        self,
        name: str,
        requests_per_second: Optional[float] = None,
        burst_size: Optional[int] = None
    ) -> RateLimiter:
        """
        Cria um rate limiter.

        Args:
            name: Nome identificador do rate limiter.
            requests_per_second: Taxa máxima de requisições por segundo.
            burst_size: Tamanho máximo do burst.

        Returns:
            RateLimiter configurado.
        """
        rl = RateLimiter(
            name=name,
            rate=requests_per_second or self.config.rate_limiter.requests_per_second,
            burst=burst_size or self.config.rate_limiter.burst_size
        )
        self._rate_limiters[name] = rl
        self.logger.debug(f"Rate limiter '{name}' criado")
        return rl

    def register_health_check(
        self,
        name: str,
        check_func: Callable[[], bool]
    ) -> None:
        """
        Registra um health check customizado.

        Args:
            name: Nome do health check.
            check_func: Função que retorna True se saudável, False caso contrário.
        """
        self._health_checks[name] = check_func
        self.logger.debug(f"Health check '{name}' registrado")

    def run_health_checks(self) -> Dict[str, bool]:
        """
        Executa todos os health checks registrados.

        Returns:
            Dicionário com nome do check e resultado (True/False).
        """
        results = {}

        for name, check_func in self._health_checks.items():
            try:
                results[name] = check_func()
            except Exception as e:
                self.logger.error(f"Health check '{name}' falhou com exceção: {e}")
                results[name] = False

        return results

    def record_metric(self, name: str, value: Any) -> None:
        """
        Registra uma métrica customizada.

        Args:
            name: Nome da métrica.
            value: Valor da métrica.
        """
        self._custom_metrics[name] = {
            "value": value,
            "timestamp": datetime.now()
        }

    def get_metrics(self) -> Dict[str, Any]:
        """
        Obtém todas as métricas atuais.

        Returns:
            Dicionário com métricas do sistema e customizadas.
        """
        result = {}

        if self._metrics_collector:
            system_metrics = self._metrics_collector.get_latest()
            if system_metrics:
                result["system"] = {
                    "cpu_percent": system_metrics.cpu_percent,
                    "memory_percent": system_metrics.memory_percent,
                    "disk_percent": system_metrics.disk_percent,
                    "network_bytes_sent": system_metrics.network_bytes_sent,
                    "network_bytes_recv": system_metrics.network_bytes_recv,
                }

        result["custom"] = self._custom_metrics
        result["circuit_breakers"] = {
            name: cb.get_state().value
            for name, cb in self._circuit_breakers.items()
        }
        result["uptime_seconds"] = (
            (datetime.now() - self._started_at).total_seconds()
            if self._started_at else 0
        )

        return result

    def get_status(self) -> Dict[str, Any]:
        """
        Obtém status geral do monitor.

        Returns:
            Dicionário com status de todos os componentes.
        """
        return {
            "running": self._running,
            "started_at": self._started_at.isoformat() if self._started_at else None,
            "app_name": self.config.app_name,
            "environment": self.config.environment,
            "components": {
                "metrics_collector": self._metrics_collector is not None,
                "anomaly_detector": self._anomaly_detector is not None,
                "auto_healer": self._auto_healer is not None,
                "watchdog": self._watchdog is not None,
                "alert_manager": self._alert_manager is not None,
            },
            "circuit_breakers": len(self._circuit_breakers),
            "rate_limiters": len(self._rate_limiters),
            "health_checks": len(self._health_checks),
        }

    def on_anomaly(self, callback: Callable) -> None:
        """Registra callback para quando anomalias são detectadas."""
        self._on_anomaly_callbacks.append(callback)

    def on_alert(self, callback: Callable) -> None:
        """Registra callback para quando alertas são enviados."""
        self._on_alert_callbacks.append(callback)
        if self._alert_manager:
            self._alert_manager.on_alert(callback)

    def on_heal(self, callback: Callable) -> None:
        """Registra callback para quando ações de healing são executadas."""
        self._on_heal_callbacks.append(callback)
        if self._auto_healer:
            self._auto_healer.on_heal(callback)

    @contextmanager
    def protected_block(
        self,
        circuit_breaker: Optional[str] = None,
        rate_limiter: Optional[str] = None,
        client_id: Optional[str] = None
    ):
        """
        Context manager para proteger um bloco de código.

        Args:
            circuit_breaker: Nome do circuit breaker a usar.
            rate_limiter: Nome do rate limiter a usar.
            client_id: ID do cliente para rate limiting per-client.

        Example:
            with monitor.protected_block(circuit_breaker="api", rate_limiter="api"):
                response = requests.get("https://api.exemplo.com")
        """
        # Rate limiting
        if rate_limiter and rate_limiter in self._rate_limiters:
            self._rate_limiters[rate_limiter].acquire(client_id)

        # Circuit breaker
        if circuit_breaker and circuit_breaker in self._circuit_breakers:
            cb = self._circuit_breakers[circuit_breaker]
            with cb:
                yield
        else:
            yield

    @classmethod
    def reset_instance(cls) -> None:
        """Reseta a instância singleton (útil para testes)."""
        with cls._lock:
            if cls._instance and cls._instance._running:
                cls._instance.stop()
            cls._instance = None

    def heartbeat(self) -> None:
        """Envia heartbeat para o watchdog."""
        if self._watchdog:
            self._watchdog.heartbeat()

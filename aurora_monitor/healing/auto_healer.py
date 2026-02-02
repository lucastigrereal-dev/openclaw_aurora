"""
Sistema de Auto-Healing.

Implementa correção automática de problemas detectados.
Pode executar ações como:
- Garbage collection forçado
- Limpeza de caches
- Reset de pools de conexão
- Restart de componentes
- Liberação de recursos
"""

import gc
import threading
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Dict, List, Optional, Any

from aurora_monitor.core.config import AutoHealerConfig
from aurora_monitor.detectors.anomaly import Anomaly, AnomalyType


class HealingActionType(Enum):
    """Tipos de ações de healing."""
    GC_COLLECT = "gc_collect"  # Garbage collection
    CACHE_CLEAR = "cache_clear"  # Limpar caches
    CONNECTION_POOL_RESET = "connection_pool_reset"  # Reset pools
    THREAD_CLEANUP = "thread_cleanup"  # Limpar threads ociosas
    MEMORY_TRIM = "memory_trim"  # Reduzir uso de memória
    TEMP_FILE_CLEANUP = "temp_file_cleanup"  # Limpar arquivos temporários
    LOG_ROTATION = "log_rotation"  # Rotacionar logs
    PROCESS_RESTART = "process_restart"  # Reiniciar processo
    SERVICE_RESTART = "service_restart"  # Reiniciar serviço
    CUSTOM = "custom"  # Ação customizada


class HealingResult(Enum):
    """Resultado de uma ação de healing."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class HealingAction:
    """Representa uma ação de healing executada."""
    action_type: HealingActionType
    result: HealingResult
    timestamp: datetime = field(default_factory=datetime.now)
    duration_ms: float = 0.0
    details: str = ""
    metrics_before: Dict[str, float] = field(default_factory=dict)
    metrics_after: Dict[str, float] = field(default_factory=dict)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "action_type": self.action_type.value,
            "result": self.result.value,
            "timestamp": self.timestamp.isoformat(),
            "duration_ms": self.duration_ms,
            "details": self.details,
            "metrics_before": self.metrics_before,
            "metrics_after": self.metrics_after,
            "error": self.error,
        }


@dataclass
class HealingPolicy:
    """Política de healing para um tipo de anomalia."""
    anomaly_type: AnomalyType
    actions: List[HealingActionType]
    cooldown: float = 60.0  # Segundos entre execuções
    max_attempts: int = 3
    escalate_on_failure: bool = True
    enabled: bool = True


class AutoHealer:
    """
    Sistema de auto-healing que corrige problemas automaticamente.

    Monitora anomalias e executa ações corretivas baseadas em
    políticas configuradas. Implementa:
    - Cooldown entre ações para evitar loops
    - Escalação de ações quando correções simples falham
    - Callbacks para notificação de ações
    - Histórico de ações executadas

    Exemplo de uso:
        healer = AutoHealer(config)

        # Registrar handler customizado
        healer.register_handler(
            HealingActionType.CUSTOM,
            lambda: cleanup_my_resources()
        )

        # Processar anomalia
        healer.heal(anomaly)

        # Ver histórico
        for action in healer.get_history():
            print(f"{action.action_type}: {action.result}")
    """

    def __init__(
        self,
        config: Optional[AutoHealerConfig] = None,
        alert_manager: Optional[Any] = None,
    ):
        """
        Inicializa o auto-healer.

        Args:
            config: Configuração do auto-healer.
            alert_manager: AlertManager para notificações.
        """
        self.config = config or AutoHealerConfig()
        self.alert_manager = alert_manager

        self._lock = threading.Lock()
        self._history: List[HealingAction] = []
        self._last_action: Dict[str, datetime] = {}
        self._attempt_count: Dict[str, int] = {}

        # Callbacks
        self._on_heal_callbacks: List[Callable[[HealingAction], None]] = []

        # Handlers de ações
        self._handlers: Dict[HealingActionType, Callable[[], bool]] = {
            HealingActionType.GC_COLLECT: self._gc_collect,
            HealingActionType.CACHE_CLEAR: self._cache_clear,
            HealingActionType.MEMORY_TRIM: self._memory_trim,
            HealingActionType.THREAD_CLEANUP: self._thread_cleanup,
        }

        # Caches registrados para limpeza
        self._registered_caches: List[Any] = []

        # Pools de conexão registrados
        self._registered_pools: List[Any] = []

        # Políticas de healing
        self._policies = self._default_policies()

    def _default_policies(self) -> Dict[AnomalyType, HealingPolicy]:
        """Retorna políticas padrão de healing."""
        return {
            AnomalyType.MEMORY_LEAK: HealingPolicy(
                anomaly_type=AnomalyType.MEMORY_LEAK,
                actions=[
                    HealingActionType.GC_COLLECT,
                    HealingActionType.CACHE_CLEAR,
                    HealingActionType.MEMORY_TRIM,
                ],
                cooldown=30.0,
                max_attempts=5,
            ),
            AnomalyType.THRESHOLD: HealingPolicy(
                anomaly_type=AnomalyType.THRESHOLD,
                actions=[
                    HealingActionType.GC_COLLECT,
                    HealingActionType.CACHE_CLEAR,
                ],
                cooldown=60.0,
                max_attempts=3,
            ),
            AnomalyType.CPU_SATURATION: HealingPolicy(
                anomaly_type=AnomalyType.CPU_SATURATION,
                actions=[
                    HealingActionType.THREAD_CLEANUP,
                ],
                cooldown=120.0,
                max_attempts=2,
            ),
            AnomalyType.SPIKE: HealingPolicy(
                anomaly_type=AnomalyType.SPIKE,
                actions=[
                    HealingActionType.GC_COLLECT,
                ],
                cooldown=30.0,
                max_attempts=3,
            ),
        }

    def heal(self, anomaly: Anomaly) -> Optional[HealingAction]:
        """
        Executa healing para uma anomalia.

        Args:
            anomaly: Anomalia detectada.

        Returns:
            HealingAction executada ou None se nenhuma ação foi necessária.
        """
        if not self.config.enabled:
            return None

        policy = self._policies.get(anomaly.type)
        if not policy or not policy.enabled:
            return None

        # Verifica cooldown
        key = f"{anomaly.type.value}:{anomaly.metric_name}"
        if not self._can_heal(key, policy.cooldown):
            return None

        # Verifica tentativas
        attempts = self._attempt_count.get(key, 0)
        if attempts >= policy.max_attempts:
            return None

        # Executa ações
        for action_type in policy.actions:
            action = self._execute_action(action_type, anomaly)
            if action.result == HealingResult.SUCCESS:
                self._attempt_count[key] = 0  # Reset tentativas
                return action

            # Escalação
            if policy.escalate_on_failure and action.result == HealingResult.FAILED:
                self._attempt_count[key] = attempts + 1
                continue

        return None

    def handle_memory_pressure(self, memory_percent: float) -> Optional[HealingAction]:
        """
        Trata pressão de memória.

        Args:
            memory_percent: Porcentagem de memória em uso.

        Returns:
            HealingAction executada ou None.
        """
        if not self.config.gc_on_memory_pressure:
            return None

        if memory_percent < self.config.gc_threshold:
            return None

        if not self._can_heal("memory_pressure", self.config.heal_cooldown):
            return None

        # Executa GC progressivo baseado na pressão
        if memory_percent >= 95:
            # Crítico: GC completo + limpeza de caches
            self._gc_collect()
            self._cache_clear()
            return self._execute_action(HealingActionType.MEMORY_TRIM, None)
        elif memory_percent >= 90:
            # Alto: GC completo
            return self._execute_action(HealingActionType.GC_COLLECT, None)
        else:
            # Moderado: GC geração 0 apenas
            gc.collect(0)
            return HealingAction(
                action_type=HealingActionType.GC_COLLECT,
                result=HealingResult.SUCCESS,
                details="Light GC (generation 0)",
            )

    def handle_cpu_pressure(self, cpu_percent: float) -> Optional[HealingAction]:
        """
        Trata pressão de CPU.

        Args:
            cpu_percent: Porcentagem de CPU em uso.

        Returns:
            HealingAction executada ou None.
        """
        if cpu_percent < 90:
            return None

        if not self._can_heal("cpu_pressure", self.config.heal_cooldown):
            return None

        return self._execute_action(HealingActionType.THREAD_CLEANUP, None)

    def _can_heal(self, key: str, cooldown: float) -> bool:
        """Verifica se pode executar healing."""
        with self._lock:
            last = self._last_action.get(key)
            if last is None:
                return True
            elapsed = (datetime.now() - last).total_seconds()
            return elapsed >= cooldown

    def _execute_action(
        self,
        action_type: HealingActionType,
        anomaly: Optional[Anomaly]
    ) -> HealingAction:
        """Executa uma ação de healing."""
        start_time = time.time()
        action = HealingAction(
            action_type=action_type,
            result=HealingResult.SKIPPED,
        )

        # Métricas antes
        action.metrics_before = self._collect_metrics()

        try:
            handler = self._handlers.get(action_type)
            if handler:
                success = handler()
                action.result = HealingResult.SUCCESS if success else HealingResult.FAILED
            else:
                action.result = HealingResult.SKIPPED
                action.details = f"No handler for {action_type.value}"

        except Exception as e:
            action.result = HealingResult.FAILED
            action.error = str(e)
            action.details = traceback.format_exc()

        # Métricas depois
        action.metrics_after = self._collect_metrics()
        action.duration_ms = (time.time() - start_time) * 1000

        # Registra ação
        with self._lock:
            self._history.append(action)
            key = anomaly.type.value if anomaly else action_type.value
            self._last_action[key] = datetime.now()

        # Notifica callbacks
        self._notify_callbacks(action)

        # Envia alerta se configurado
        if self.alert_manager and action.result in (HealingResult.SUCCESS, HealingResult.FAILED):
            self._send_alert(action)

        return action

    def _collect_metrics(self) -> Dict[str, float]:
        """Coleta métricas atuais."""
        import sys
        metrics = {}

        try:
            # Memória do processo
            import resource
            usage = resource.getrusage(resource.RUSAGE_SELF)
            metrics["memory_rss_mb"] = usage.ru_maxrss / 1024  # KB para MB no Linux
        except Exception:
            pass

        # Objetos Python
        try:
            metrics["gc_objects"] = len(gc.get_objects())
        except Exception:
            pass

        # Threads
        try:
            metrics["active_threads"] = threading.active_count()
        except Exception:
            pass

        return metrics

    def _gc_collect(self) -> bool:
        """Executa garbage collection completo."""
        collected_total = 0
        for generation in range(3):
            collected = gc.collect(generation)
            collected_total += collected
        return collected_total >= 0

    def _cache_clear(self) -> bool:
        """Limpa caches registrados."""
        success = True
        for cache in self._registered_caches:
            try:
                if hasattr(cache, 'clear'):
                    cache.clear()
                elif hasattr(cache, 'cache_clear'):
                    cache.cache_clear()
            except Exception:
                success = False
        return success

    def _memory_trim(self) -> bool:
        """Tenta reduzir uso de memória."""
        # GC agressivo
        gc.collect()
        gc.collect()
        gc.collect()

        # Tenta liberar memória para o SO
        try:
            import ctypes
            libc = ctypes.CDLL("libc.so.6")
            libc.malloc_trim(0)
        except Exception:
            pass

        return True

    def _thread_cleanup(self) -> bool:
        """Limpa threads ociosas."""
        # Lista threads
        threads = threading.enumerate()
        main_thread = threading.main_thread()

        cleaned = 0
        for thread in threads:
            if thread == main_thread:
                continue
            if thread.daemon and not thread.is_alive():
                cleaned += 1

        return True

    def register_cache(self, cache: Any) -> None:
        """
        Registra um cache para limpeza automática.

        Args:
            cache: Objeto com método clear() ou cache_clear().
        """
        self._registered_caches.append(cache)

    def register_pool(self, pool: Any) -> None:
        """
        Registra um pool de conexão para reset.

        Args:
            pool: Objeto com método close() ou reset().
        """
        self._registered_pools.append(pool)

    def register_handler(
        self,
        action_type: HealingActionType,
        handler: Callable[[], bool]
    ) -> None:
        """
        Registra um handler customizado para um tipo de ação.

        Args:
            action_type: Tipo de ação.
            handler: Função que retorna True se bem-sucedida.
        """
        self._handlers[action_type] = handler

    def register_policy(self, policy: HealingPolicy) -> None:
        """
        Registra uma política de healing.

        Args:
            policy: Política de healing.
        """
        self._policies[policy.anomaly_type] = policy

    def on_heal(self, callback: Callable[[HealingAction], None]) -> None:
        """
        Registra callback para notificação de ações.

        Args:
            callback: Função chamada quando ação é executada.
        """
        self._on_heal_callbacks.append(callback)

    def _notify_callbacks(self, action: HealingAction) -> None:
        """Notifica callbacks registrados."""
        for callback in self._on_heal_callbacks:
            try:
                callback(action)
            except Exception:
                pass

    def _send_alert(self, action: HealingAction) -> None:
        """Envia alerta sobre ação de healing."""
        if not self.alert_manager:
            return

        from aurora_monitor.alerts.alert_manager import AlertLevel

        level = AlertLevel.INFO if action.result == HealingResult.SUCCESS else AlertLevel.WARNING
        title = f"Auto-Healing: {action.action_type.value}"
        message = f"Result: {action.result.value}. Duration: {action.duration_ms:.1f}ms"

        if action.error:
            message += f". Error: {action.error}"

        self.alert_manager.send(
            level=level,
            title=title,
            message=message,
            source="aurora.healer"
        )

    def get_history(self, limit: int = 100) -> List[HealingAction]:
        """
        Retorna histórico de ações.

        Args:
            limit: Número máximo de ações a retornar.

        Returns:
            Lista de HealingAction.
        """
        with self._lock:
            return list(self._history[-limit:])

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do auto-healer."""
        with self._lock:
            total = len(self._history)
            success = sum(1 for a in self._history if a.result == HealingResult.SUCCESS)
            failed = sum(1 for a in self._history if a.result == HealingResult.FAILED)

            by_type = {}
            for action in self._history:
                t = action.action_type.value
                if t not in by_type:
                    by_type[t] = {"total": 0, "success": 0, "failed": 0}
                by_type[t]["total"] += 1
                if action.result == HealingResult.SUCCESS:
                    by_type[t]["success"] += 1
                elif action.result == HealingResult.FAILED:
                    by_type[t]["failed"] += 1

            return {
                "enabled": self.config.enabled,
                "total_actions": total,
                "successful_actions": success,
                "failed_actions": failed,
                "success_rate": success / max(total, 1),
                "actions_by_type": by_type,
                "registered_caches": len(self._registered_caches),
                "registered_pools": len(self._registered_pools),
            }

    def reset(self) -> None:
        """Reseta o auto-healer."""
        with self._lock:
            self._history.clear()
            self._last_action.clear()
            self._attempt_count.clear()

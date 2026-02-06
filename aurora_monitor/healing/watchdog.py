"""
Process Watchdog - Monitora saúde do processo.

Detecta problemas como:
- Processo não responsivo (sem heartbeat)
- Deadlocks
- Threads travadas
- Consumo excessivo de recursos
"""

import os
import sys
import signal
import threading
import time
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Callable, Dict, List, Optional, Any, Set
from enum import Enum

from aurora_monitor.core.config import WatchdogConfig


class ProcessState(Enum):
    """Estados do processo monitorado."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNRESPONSIVE = "unresponsive"
    DEADLOCKED = "deadlocked"
    CRITICAL = "critical"


@dataclass
class ThreadInfo:
    """Informações sobre uma thread."""
    thread_id: int
    name: str
    daemon: bool
    is_alive: bool
    stack_trace: str = ""
    last_activity: datetime = field(default_factory=datetime.now)
    cpu_time: float = 0.0


@dataclass
class WatchdogEvent:
    """Evento detectado pelo watchdog."""
    event_type: str
    severity: str
    timestamp: datetime = field(default_factory=datetime.now)
    details: str = ""
    thread_id: Optional[int] = None
    action_taken: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "event_type": self.event_type,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details,
            "thread_id": self.thread_id,
            "action_taken": self.action_taken,
        }


class ProcessWatchdog:
    """
    Watchdog para monitoramento de processos.

    Monitora a saúde do processo em execução, detectando:
    - Falta de heartbeat (processo travado)
    - Deadlocks entre threads
    - Threads bloqueadas por muito tempo
    - Vazamento de threads

    Exemplo de uso:
        watchdog = ProcessWatchdog()
        watchdog.start()

        # No loop principal da aplicação:
        while running:
            watchdog.heartbeat()
            do_work()

        watchdog.stop()

    Com callbacks:
        def on_problem(event):
            logger.error(f"Watchdog detected: {event}")

        watchdog.on_event(on_problem)
    """

    def __init__(
        self,
        config: Optional[WatchdogConfig] = None,
        alert_manager: Optional[Any] = None,
    ):
        """
        Inicializa o watchdog.

        Args:
            config: Configuração do watchdog.
            alert_manager: AlertManager para notificações.
        """
        self.config = config or WatchdogConfig()
        self.alert_manager = alert_manager

        self._running = False
        self._state = ProcessState.HEALTHY
        self._last_heartbeat = datetime.now()
        self._heartbeat_lock = threading.Lock()

        self._thread: Optional[threading.Thread] = None
        self._events: List[WatchdogEvent] = []
        self._events_lock = threading.Lock()

        # Callbacks
        self._on_event_callbacks: List[Callable[[WatchdogEvent], None]] = []
        self._on_state_change_callbacks: List[Callable[[ProcessState, ProcessState], None]] = []

        # Monitoramento de threads
        self._thread_states: Dict[int, ThreadInfo] = {}
        self._potential_deadlocks: Set[int] = set()

        # Contagem de restarts
        self._restart_count = 0
        self._last_restart: Optional[datetime] = None

    def start(self) -> None:
        """Inicia o watchdog."""
        if self._running:
            return

        self._running = True
        self._last_heartbeat = datetime.now()

        if self.config.enabled:
            self._thread = threading.Thread(
                target=self._monitor_loop,
                name="aurora-watchdog",
                daemon=True
            )
            self._thread.start()

    def stop(self) -> None:
        """Para o watchdog."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5.0)

    def heartbeat(self) -> None:
        """
        Envia heartbeat indicando que o processo está saudável.

        Deve ser chamado regularmente no loop principal da aplicação.
        """
        with self._heartbeat_lock:
            self._last_heartbeat = datetime.now()
            if self._state == ProcessState.UNRESPONSIVE:
                self._transition_state(ProcessState.HEALTHY)

    def check(self) -> ProcessState:
        """
        Executa verificação manual do estado.

        Returns:
            Estado atual do processo.
        """
        self._check_heartbeat()
        self._check_threads()
        return self._state

    def _monitor_loop(self) -> None:
        """Loop principal de monitoramento."""
        while self._running:
            try:
                self._check_heartbeat()

                if self.config.monitor_threads:
                    self._check_threads()

                if self.config.deadlock_detection:
                    self._check_deadlocks()

                time.sleep(self.config.check_interval)

            except Exception as e:
                self._record_event(WatchdogEvent(
                    event_type="monitor_error",
                    severity="warning",
                    details=f"Error in watchdog loop: {e}",
                ))

    def _check_heartbeat(self) -> None:
        """Verifica se heartbeat está em dia."""
        with self._heartbeat_lock:
            elapsed = (datetime.now() - self._last_heartbeat).total_seconds()

        if elapsed > self.config.heartbeat_timeout:
            if self._state != ProcessState.UNRESPONSIVE:
                self._transition_state(ProcessState.UNRESPONSIVE)
                self._record_event(WatchdogEvent(
                    event_type="heartbeat_timeout",
                    severity="critical",
                    details=f"No heartbeat for {elapsed:.1f}s (timeout: {self.config.heartbeat_timeout}s)",
                ))

                # Tenta recuperação
                if self.config.max_restarts > self._restart_count:
                    self._attempt_recovery()

    def _check_threads(self) -> None:
        """Verifica estado das threads."""
        current_threads = {}
        for thread in threading.enumerate():
            tid = thread.ident
            if tid is None:
                continue

            info = ThreadInfo(
                thread_id=tid,
                name=thread.name,
                daemon=thread.daemon,
                is_alive=thread.is_alive(),
            )

            # Captura stack trace
            frame = sys._current_frames().get(tid)
            if frame:
                info.stack_trace = "".join(traceback.format_stack(frame))

            current_threads[tid] = info

        # Detecta threads novas
        for tid, info in current_threads.items():
            if tid not in self._thread_states:
                self._thread_states[tid] = info

        # Detecta threads que morreram
        dead_threads = set(self._thread_states.keys()) - set(current_threads.keys())
        for tid in dead_threads:
            old_info = self._thread_states.pop(tid)
            if not old_info.daemon:
                self._record_event(WatchdogEvent(
                    event_type="thread_died",
                    severity="warning",
                    details=f"Thread '{old_info.name}' (id={tid}) died",
                    thread_id=tid,
                ))

        # Atualiza estados
        self._thread_states = current_threads

        # Detecta vazamento de threads
        if len(current_threads) > 100:
            self._record_event(WatchdogEvent(
                event_type="thread_leak",
                severity="warning",
                details=f"High thread count: {len(current_threads)}",
            ))

    def _check_deadlocks(self) -> None:
        """Detecta possíveis deadlocks."""
        # Análise simplificada de deadlock baseada em threads bloqueadas
        blocked_threads = []

        for tid, info in self._thread_states.items():
            if info.is_alive and info.stack_trace:
                # Verifica se thread parece bloqueada em lock
                if any(pattern in info.stack_trace.lower() for pattern in
                       ['acquire', 'wait', 'lock', 'join', 'recv', 'accept']):
                    blocked_threads.append(tid)

        # Se muitas threads estão bloqueadas, pode ser deadlock
        if len(blocked_threads) >= 3:
            if not self._potential_deadlocks:
                self._potential_deadlocks = set(blocked_threads)
            elif self._potential_deadlocks == set(blocked_threads):
                # Mesmas threads bloqueadas = provável deadlock
                self._transition_state(ProcessState.DEADLOCKED)
                self._record_event(WatchdogEvent(
                    event_type="deadlock_detected",
                    severity="critical",
                    details=f"Potential deadlock involving threads: {blocked_threads}",
                ))
            else:
                self._potential_deadlocks = set(blocked_threads)
        else:
            self._potential_deadlocks.clear()

    def _attempt_recovery(self) -> None:
        """Tenta recuperar processo problemático."""
        self._restart_count += 1
        self._last_restart = datetime.now()

        action = "none"

        # Estratégias de recuperação
        if self._restart_count <= self.config.max_restarts:
            if self._state == ProcessState.DEADLOCKED:
                # Tenta interromper threads bloqueadas
                action = "interrupt_threads"
                self._interrupt_blocked_threads()

            elif self._state == ProcessState.UNRESPONSIVE:
                # Força garbage collection
                action = "force_gc"
                import gc
                gc.collect()

        self._record_event(WatchdogEvent(
            event_type="recovery_attempt",
            severity="warning",
            details=f"Attempt {self._restart_count}/{self.config.max_restarts}",
            action_taken=action,
        ))

    def _interrupt_blocked_threads(self) -> None:
        """Tenta interromper threads bloqueadas."""
        main_thread = threading.main_thread()

        for tid, info in self._thread_states.items():
            if tid == main_thread.ident:
                continue
            if tid in self._potential_deadlocks:
                try:
                    # Envia sinal para thread (se possível)
                    import ctypes
                    ctypes.pythonapi.PyThreadState_SetAsyncExc(
                        ctypes.c_ulong(tid),
                        ctypes.py_object(KeyboardInterrupt)
                    )
                except Exception:
                    pass

    def _transition_state(self, new_state: ProcessState) -> None:
        """Transiciona para novo estado."""
        old_state = self._state
        if old_state == new_state:
            return

        self._state = new_state

        # Notifica callbacks
        for callback in self._on_state_change_callbacks:
            try:
                callback(old_state, new_state)
            except Exception:
                pass

        # Envia alerta
        if self.alert_manager:
            from aurora_monitor.alerts.alert_manager import AlertLevel

            level_map = {
                ProcessState.HEALTHY: AlertLevel.INFO,
                ProcessState.DEGRADED: AlertLevel.WARNING,
                ProcessState.UNRESPONSIVE: AlertLevel.CRITICAL,
                ProcessState.DEADLOCKED: AlertLevel.CRITICAL,
                ProcessState.CRITICAL: AlertLevel.CRITICAL,
            }

            self.alert_manager.send(
                level=level_map.get(new_state, AlertLevel.WARNING),
                title=f"Process State: {new_state.value}",
                message=f"Process state changed from {old_state.value} to {new_state.value}",
                source="aurora.watchdog"
            )

    def _record_event(self, event: WatchdogEvent) -> None:
        """Registra um evento."""
        with self._events_lock:
            self._events.append(event)
            # Mantém últimos 1000 eventos
            if len(self._events) > 1000:
                self._events = self._events[-1000:]

        # Notifica callbacks
        for callback in self._on_event_callbacks:
            try:
                callback(event)
            except Exception:
                pass

    def on_event(self, callback: Callable[[WatchdogEvent], None]) -> None:
        """
        Registra callback para eventos.

        Args:
            callback: Função chamada quando evento ocorre.
        """
        self._on_event_callbacks.append(callback)

    def on_state_change(
        self,
        callback: Callable[[ProcessState, ProcessState], None]
    ) -> None:
        """
        Registra callback para mudanças de estado.

        Args:
            callback: Função chamada quando estado muda.
        """
        self._on_state_change_callbacks.append(callback)

    def get_state(self) -> ProcessState:
        """Retorna estado atual."""
        return self._state

    def get_events(self, limit: int = 100) -> List[WatchdogEvent]:
        """
        Retorna eventos recentes.

        Args:
            limit: Número máximo de eventos.

        Returns:
            Lista de WatchdogEvent.
        """
        with self._events_lock:
            return list(self._events[-limit:])

    def get_thread_info(self) -> List[ThreadInfo]:
        """Retorna informações das threads."""
        return list(self._thread_states.values())

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do watchdog."""
        with self._heartbeat_lock:
            last_hb = self._last_heartbeat

        with self._events_lock:
            events_count = len(self._events)
            critical_events = sum(1 for e in self._events if e.severity == "critical")

        return {
            "enabled": self.config.enabled,
            "state": self._state.value,
            "last_heartbeat": last_hb.isoformat(),
            "heartbeat_age_seconds": (datetime.now() - last_hb).total_seconds(),
            "active_threads": len(self._thread_states),
            "restart_count": self._restart_count,
            "max_restarts": self.config.max_restarts,
            "total_events": events_count,
            "critical_events": critical_events,
            "potential_deadlocks": len(self._potential_deadlocks),
        }

    def reset(self) -> None:
        """Reseta o watchdog."""
        with self._heartbeat_lock:
            self._last_heartbeat = datetime.now()
        self._state = ProcessState.HEALTHY
        self._restart_count = 0
        with self._events_lock:
            self._events.clear()
        self._potential_deadlocks.clear()

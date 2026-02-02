"""
Circuit Breaker Pattern Implementation.

O Circuit Breaker é um padrão de design que previne falhas em cascata.
Quando um serviço está falhando, o circuit breaker "abre" para evitar
chamadas desnecessárias e dar tempo para recuperação.

Estados:
- CLOSED: Operação normal, chamadas passam
- OPEN: Circuito aberto, chamadas são bloqueadas
- HALF_OPEN: Teste de recuperação, permite algumas chamadas
"""

import threading
import time
import functools
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Callable, Optional, List, Any, Dict, Type


class CircuitState(Enum):
    """Estados do circuit breaker."""
    CLOSED = "CLOSED"  # Normal operation
    OPEN = "OPEN"  # Blocking calls
    HALF_OPEN = "HALF_OPEN"  # Testing recovery


class CircuitBreakerError(Exception):
    """Exceção lançada quando o circuit breaker está aberto."""

    def __init__(self, name: str, state: CircuitState, retry_after: float = 0):
        self.name = name
        self.state = state
        self.retry_after = retry_after
        super().__init__(f"Circuit breaker '{name}' is {state.value}. Retry after {retry_after:.1f}s")


@dataclass
class CircuitStats:
    """Estatísticas do circuit breaker."""
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    rejected_calls: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    state_changes: List[Dict[str, Any]] = field(default_factory=list)
    open_count: int = 0
    average_response_time: float = 0.0
    _response_times: List[float] = field(default_factory=list)

    def record_success(self, response_time: float) -> None:
        """Registra chamada bem-sucedida."""
        self.total_calls += 1
        self.successful_calls += 1
        self.consecutive_successes += 1
        self.consecutive_failures = 0
        self.last_success_time = datetime.now()
        self._record_response_time(response_time)

    def record_failure(self) -> None:
        """Registra chamada com falha."""
        self.total_calls += 1
        self.failed_calls += 1
        self.consecutive_failures += 1
        self.consecutive_successes = 0
        self.last_failure_time = datetime.now()

    def record_rejection(self) -> None:
        """Registra chamada rejeitada."""
        self.rejected_calls += 1

    def record_state_change(self, old_state: CircuitState, new_state: CircuitState) -> None:
        """Registra mudança de estado."""
        self.state_changes.append({
            "timestamp": datetime.now().isoformat(),
            "from": old_state.value,
            "to": new_state.value,
        })
        if new_state == CircuitState.OPEN:
            self.open_count += 1

    def _record_response_time(self, response_time: float) -> None:
        """Registra tempo de resposta."""
        self._response_times.append(response_time)
        # Mantém últimos 100 tempos
        if len(self._response_times) > 100:
            self._response_times = self._response_times[-100:]
        self.average_response_time = sum(self._response_times) / len(self._response_times)

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "rejected_calls": self.rejected_calls,
            "success_rate": self.successful_calls / max(self.total_calls, 1),
            "consecutive_failures": self.consecutive_failures,
            "consecutive_successes": self.consecutive_successes,
            "open_count": self.open_count,
            "average_response_time": self.average_response_time,
            "last_failure": self.last_failure_time.isoformat() if self.last_failure_time else None,
            "last_success": self.last_success_time.isoformat() if self.last_success_time else None,
        }


class CircuitBreaker:
    """
    Implementação do padrão Circuit Breaker.

    Protege contra falhas em cascata monitorando chamadas
    e abrindo o circuito quando falhas excedem um threshold.

    Exemplo de uso como decorator:
        cb = CircuitBreaker("external-api", failure_threshold=5)

        @cb
        def call_api():
            return requests.get("https://api.example.com")

    Exemplo de uso como context manager:
        with cb.protected():
            response = requests.get("https://api.example.com")

    Exemplo de uso direto:
        cb = CircuitBreaker("db")
        try:
            with cb:
                result = database.query(...)
        except CircuitBreakerError:
            return cached_result
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout: float = 30.0,
        half_open_max_calls: int = 3,
        excluded_exceptions: Optional[List[Type[Exception]]] = None,
        on_state_change: Optional[Callable[[CircuitState, CircuitState], None]] = None,
        on_failure: Optional[Callable[[Exception], None]] = None,
        fallback: Optional[Callable[[], Any]] = None,
    ):
        """
        Inicializa o circuit breaker.

        Args:
            name: Nome identificador do circuit breaker.
            failure_threshold: Número de falhas para abrir o circuito.
            success_threshold: Número de sucessos em HALF_OPEN para fechar.
            timeout: Tempo em segundos antes de tentar HALF_OPEN.
            half_open_max_calls: Número máximo de chamadas em HALF_OPEN.
            excluded_exceptions: Exceções que não contam como falha.
            on_state_change: Callback para mudanças de estado.
            on_failure: Callback para falhas.
            fallback: Função de fallback quando circuito está aberto.
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        self.half_open_max_calls = half_open_max_calls
        self.excluded_exceptions = excluded_exceptions or []
        self.on_state_change = on_state_change
        self.on_failure = on_failure
        self.fallback = fallback

        self._state = CircuitState.CLOSED
        self._last_state_change = datetime.now()
        self._lock = threading.RLock()
        self._half_open_calls = 0

        self.stats = CircuitStats()

    @property
    def state(self) -> CircuitState:
        """Retorna estado atual (pode mudar para HALF_OPEN se timeout expirou)."""
        with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._transition_to(CircuitState.HALF_OPEN)
            return self._state

    def get_state(self) -> CircuitState:
        """Retorna estado atual."""
        return self.state

    def _should_attempt_reset(self) -> bool:
        """Verifica se deve tentar resetar o circuito."""
        elapsed = (datetime.now() - self._last_state_change).total_seconds()
        return elapsed >= self.timeout

    def _transition_to(self, new_state: CircuitState) -> None:
        """Transiciona para novo estado."""
        old_state = self._state
        if old_state == new_state:
            return

        self._state = new_state
        self._last_state_change = datetime.now()
        self._half_open_calls = 0

        self.stats.record_state_change(old_state, new_state)

        if self.on_state_change:
            try:
                self.on_state_change(old_state, new_state)
            except Exception:
                pass  # Ignora erros no callback

    def _can_execute(self) -> bool:
        """Verifica se pode executar chamada."""
        state = self.state

        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.OPEN:
            return False
        else:  # HALF_OPEN
            return self._half_open_calls < self.half_open_max_calls

    def _is_excluded_exception(self, exc: Exception) -> bool:
        """Verifica se exceção está na lista de exclusão."""
        return any(isinstance(exc, exc_type) for exc_type in self.excluded_exceptions)

    def _handle_success(self, response_time: float) -> None:
        """Trata chamada bem-sucedida."""
        with self._lock:
            self.stats.record_success(response_time)

            if self._state == CircuitState.HALF_OPEN:
                if self.stats.consecutive_successes >= self.success_threshold:
                    self._transition_to(CircuitState.CLOSED)

    def _handle_failure(self, exc: Exception) -> None:
        """Trata chamada com falha."""
        if self._is_excluded_exception(exc):
            return

        with self._lock:
            self.stats.record_failure()

            if self.on_failure:
                try:
                    self.on_failure(exc)
                except Exception:
                    pass

            if self._state == CircuitState.HALF_OPEN:
                self._transition_to(CircuitState.OPEN)
            elif self._state == CircuitState.CLOSED:
                if self.stats.consecutive_failures >= self.failure_threshold:
                    self._transition_to(CircuitState.OPEN)

    def __enter__(self) -> "CircuitBreaker":
        """Entry point para context manager."""
        with self._lock:
            if not self._can_execute():
                self.stats.record_rejection()
                retry_after = max(0, self.timeout - (datetime.now() - self._last_state_change).total_seconds())
                raise CircuitBreakerError(self.name, self._state, retry_after)

            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls += 1

        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        """Exit point para context manager."""
        if exc_type is None:
            self._handle_success(0)  # Sem informação de tempo neste caso
        else:
            self._handle_failure(exc_val)

        return False  # Não suprime exceções

    def __call__(self, func: Callable) -> Callable:
        """Decorator para proteger funções."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Executa função protegida pelo circuit breaker.

        Args:
            func: Função a executar.
            *args: Argumentos posicionais.
            **kwargs: Argumentos nomeados.

        Returns:
            Resultado da função ou fallback.

        Raises:
            CircuitBreakerError: Se o circuito está aberto e não há fallback.
        """
        with self._lock:
            if not self._can_execute():
                self.stats.record_rejection()
                if self.fallback:
                    return self.fallback()
                retry_after = max(0, self.timeout - (datetime.now() - self._last_state_change).total_seconds())
                raise CircuitBreakerError(self.name, self._state, retry_after)

            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls += 1

        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            elapsed = time.time() - start_time
            self._handle_success(elapsed)
            return result
        except Exception as e:
            self._handle_failure(e)
            if self.fallback and self._state == CircuitState.OPEN:
                return self.fallback()
            raise

    @contextmanager
    def protected(self):
        """Context manager alternativo com tratamento de fallback."""
        try:
            with self:
                yield
        except CircuitBreakerError:
            if self.fallback:
                yield self.fallback()
            else:
                raise

    def reset(self) -> None:
        """Reseta o circuit breaker para estado CLOSED."""
        with self._lock:
            self._transition_to(CircuitState.CLOSED)
            self.stats.consecutive_failures = 0
            self.stats.consecutive_successes = 0

    def force_open(self) -> None:
        """Força o circuito a abrir."""
        with self._lock:
            self._transition_to(CircuitState.OPEN)

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do circuit breaker."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_threshold": self.failure_threshold,
            "success_threshold": self.success_threshold,
            "timeout": self.timeout,
            "stats": self.stats.to_dict(),
        }

    def is_closed(self) -> bool:
        """Verifica se circuito está fechado."""
        return self.state == CircuitState.CLOSED

    def is_open(self) -> bool:
        """Verifica se circuito está aberto."""
        return self.state == CircuitState.OPEN

    def time_until_retry(self) -> float:
        """Retorna tempo até próxima tentativa de retry."""
        if self._state != CircuitState.OPEN:
            return 0.0
        elapsed = (datetime.now() - self._last_state_change).total_seconds()
        return max(0, self.timeout - elapsed)


class CircuitBreakerRegistry:
    """
    Registro global de circuit breakers.

    Permite gerenciar múltiplos circuit breakers de forma centralizada.
    """

    _instance: Optional["CircuitBreakerRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._breakers = {}
        return cls._instance

    def get_or_create(
        self,
        name: str,
        **kwargs
    ) -> CircuitBreaker:
        """Obtém ou cria um circuit breaker."""
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(name, **kwargs)
        return self._breakers[name]

    def get(self, name: str) -> Optional[CircuitBreaker]:
        """Obtém circuit breaker por nome."""
        return self._breakers.get(name)

    def all(self) -> Dict[str, CircuitBreaker]:
        """Retorna todos os circuit breakers."""
        return dict(self._breakers)

    def reset_all(self) -> None:
        """Reseta todos os circuit breakers."""
        for cb in self._breakers.values():
            cb.reset()

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Retorna estatísticas de todos os circuit breakers."""
        return {name: cb.get_stats() for name, cb in self._breakers.items()}

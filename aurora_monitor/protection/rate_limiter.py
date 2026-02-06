"""
Rate Limiter Implementation.

Implementa limitação de taxa usando o algoritmo Token Bucket.
Protege serviços contra sobrecarga controlando a taxa de requisições.
"""

import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional, Any
import functools


class RateLimitExceeded(Exception):
    """Exceção lançada quando o rate limit é excedido."""

    def __init__(self, limiter_name: str, retry_after: float, current_rate: float):
        self.limiter_name = limiter_name
        self.retry_after = retry_after
        self.current_rate = current_rate
        super().__init__(
            f"Rate limit exceeded for '{limiter_name}'. "
            f"Retry after {retry_after:.2f}s. Current rate: {current_rate:.2f}/s"
        )


@dataclass
class RateLimiterStats:
    """Estatísticas do rate limiter."""
    total_requests: int = 0
    accepted_requests: int = 0
    rejected_requests: int = 0
    last_request_time: Optional[datetime] = None
    last_rejection_time: Optional[datetime] = None
    current_rate: float = 0.0
    peak_rate: float = 0.0
    _request_times: list = field(default_factory=list)

    def record_request(self, accepted: bool) -> None:
        """Registra uma requisição."""
        now = datetime.now()
        self.total_requests += 1
        self.last_request_time = now

        if accepted:
            self.accepted_requests += 1
            self._request_times.append(time.time())
            # Mantém apenas últimos 60 segundos
            cutoff = time.time() - 60
            self._request_times = [t for t in self._request_times if t > cutoff]
            self.current_rate = len(self._request_times) / 60
            self.peak_rate = max(self.peak_rate, self.current_rate)
        else:
            self.rejected_requests += 1
            self.last_rejection_time = now

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "total_requests": self.total_requests,
            "accepted_requests": self.accepted_requests,
            "rejected_requests": self.rejected_requests,
            "rejection_rate": self.rejected_requests / max(self.total_requests, 1),
            "current_rate": self.current_rate,
            "peak_rate": self.peak_rate,
            "last_request": self.last_request_time.isoformat() if self.last_request_time else None,
            "last_rejection": self.last_rejection_time.isoformat() if self.last_rejection_time else None,
        }


class TokenBucket:
    """
    Implementação do algoritmo Token Bucket.

    O bucket é preenchido com tokens a uma taxa constante.
    Cada requisição consome um token. Se não há tokens,
    a requisição é rejeitada.
    """

    def __init__(self, rate: float, burst: int):
        """
        Inicializa o bucket.

        Args:
            rate: Taxa de tokens por segundo.
            burst: Capacidade máxima do bucket.
        """
        self.rate = rate
        self.burst = burst
        self._tokens = float(burst)
        self._last_update = time.time()
        self._lock = threading.Lock()

    def _refill(self) -> None:
        """Reabastece tokens baseado no tempo decorrido."""
        now = time.time()
        elapsed = now - self._last_update
        self._tokens = min(self.burst, self._tokens + elapsed * self.rate)
        self._last_update = now

    def acquire(self, tokens: int = 1, blocking: bool = False, timeout: float = 0) -> bool:
        """
        Tenta adquirir tokens.

        Args:
            tokens: Número de tokens a adquirir.
            blocking: Se True, bloqueia até conseguir tokens.
            timeout: Tempo máximo de espera se blocking=True.

        Returns:
            True se tokens foram adquiridos, False caso contrário.
        """
        deadline = time.time() + timeout if blocking else 0

        while True:
            with self._lock:
                self._refill()

                if self._tokens >= tokens:
                    self._tokens -= tokens
                    return True

                if not blocking:
                    return False

                # Calcula tempo até ter tokens suficientes
                deficit = tokens - self._tokens
                wait_time = deficit / self.rate

            if time.time() + wait_time > deadline:
                return False

            time.sleep(min(wait_time, 0.1))

    def get_wait_time(self, tokens: int = 1) -> float:
        """
        Retorna tempo estimado até ter tokens disponíveis.

        Args:
            tokens: Número de tokens necessários.

        Returns:
            Tempo em segundos.
        """
        with self._lock:
            self._refill()
            if self._tokens >= tokens:
                return 0.0
            deficit = tokens - self._tokens
            return deficit / self.rate

    @property
    def available_tokens(self) -> float:
        """Retorna número de tokens disponíveis."""
        with self._lock:
            self._refill()
            return self._tokens


class RateLimiter:
    """
    Rate Limiter com suporte a múltiplos clientes.

    Permite limitar taxa global e/ou por cliente.

    Exemplo de uso como decorator:
        limiter = RateLimiter("api", rate=10, burst=20)

        @limiter
        def api_call():
            return make_request()

    Exemplo de uso direto:
        limiter = RateLimiter("api", rate=100)

        if limiter.acquire():
            process_request()
        else:
            return "Rate limit exceeded"

    Exemplo com identificação de cliente:
        limiter = RateLimiter("api", rate=100)

        if limiter.acquire(client_id="user123"):
            process_request()
    """

    def __init__(
        self,
        name: str,
        rate: float,
        burst: Optional[int] = None,
        per_client_rate: Optional[float] = None,
        per_client_burst: Optional[int] = None,
        raise_on_limit: bool = True,
    ):
        """
        Inicializa o rate limiter.

        Args:
            name: Nome identificador.
            rate: Taxa máxima de requisições por segundo (global).
            burst: Capacidade de burst (padrão: rate * 1.5).
            per_client_rate: Taxa máxima por cliente.
            per_client_burst: Burst por cliente.
            raise_on_limit: Se True, lança exceção quando limite é excedido.
        """
        self.name = name
        self.rate = rate
        self.burst = burst or int(rate * 1.5)
        self.per_client_rate = per_client_rate
        self.per_client_burst = per_client_burst or (int(per_client_rate * 1.5) if per_client_rate else None)
        self.raise_on_limit = raise_on_limit

        # Bucket global
        self._global_bucket = TokenBucket(rate, self.burst)

        # Buckets por cliente
        self._client_buckets: Dict[str, TokenBucket] = {}
        self._client_lock = threading.Lock()

        # Estatísticas
        self.stats = RateLimiterStats()
        self._client_stats: Dict[str, RateLimiterStats] = {}

    def _get_client_bucket(self, client_id: str) -> TokenBucket:
        """Obtém ou cria bucket para cliente."""
        if client_id not in self._client_buckets:
            with self._client_lock:
                if client_id not in self._client_buckets:
                    self._client_buckets[client_id] = TokenBucket(
                        self.per_client_rate or self.rate,
                        self.per_client_burst or self.burst
                    )
                    self._client_stats[client_id] = RateLimiterStats()
        return self._client_buckets[client_id]

    def acquire(
        self,
        client_id: Optional[str] = None,
        tokens: int = 1,
        blocking: bool = False,
        timeout: float = 0
    ) -> bool:
        """
        Tenta adquirir permissão para prosseguir.

        Args:
            client_id: ID do cliente (para rate limiting per-client).
            tokens: Número de tokens a consumir.
            blocking: Se True, bloqueia até conseguir permissão.
            timeout: Tempo máximo de espera.

        Returns:
            True se permissão concedida, False caso contrário.

        Raises:
            RateLimitExceeded: Se raise_on_limit=True e limite excedido.
        """
        # Verifica limite global
        if not self._global_bucket.acquire(tokens, blocking, timeout):
            self.stats.record_request(False)
            if self.raise_on_limit:
                raise RateLimitExceeded(
                    self.name,
                    self._global_bucket.get_wait_time(tokens),
                    self.stats.current_rate
                )
            return False

        # Verifica limite por cliente
        if client_id and self.per_client_rate:
            client_bucket = self._get_client_bucket(client_id)
            if not client_bucket.acquire(tokens, blocking, timeout):
                # Devolve token global
                self._global_bucket._tokens = min(
                    self._global_bucket.burst,
                    self._global_bucket._tokens + tokens
                )
                self.stats.record_request(False)
                self._client_stats[client_id].record_request(False)
                if self.raise_on_limit:
                    raise RateLimitExceeded(
                        f"{self.name}:{client_id}",
                        client_bucket.get_wait_time(tokens),
                        self._client_stats[client_id].current_rate
                    )
                return False
            self._client_stats[client_id].record_request(True)

        self.stats.record_request(True)
        return True

    def __call__(self, func):
        """Decorator para proteger funções."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Tenta extrair client_id dos argumentos
            client_id = kwargs.pop('_rate_limit_client_id', None)
            self.acquire(client_id=client_id)
            return func(*args, **kwargs)
        return wrapper

    def get_wait_time(self, client_id: Optional[str] = None, tokens: int = 1) -> float:
        """
        Retorna tempo estimado até poder prosseguir.

        Args:
            client_id: ID do cliente.
            tokens: Número de tokens necessários.

        Returns:
            Tempo em segundos.
        """
        global_wait = self._global_bucket.get_wait_time(tokens)

        if client_id and self.per_client_rate and client_id in self._client_buckets:
            client_wait = self._client_buckets[client_id].get_wait_time(tokens)
            return max(global_wait, client_wait)

        return global_wait

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do rate limiter."""
        return {
            "name": self.name,
            "rate": self.rate,
            "burst": self.burst,
            "available_tokens": self._global_bucket.available_tokens,
            "per_client_rate": self.per_client_rate,
            "stats": self.stats.to_dict(),
            "clients": len(self._client_buckets),
        }

    def get_client_stats(self, client_id: str) -> Optional[Dict[str, Any]]:
        """Retorna estatísticas de um cliente específico."""
        if client_id in self._client_stats:
            return {
                "client_id": client_id,
                "available_tokens": self._client_buckets[client_id].available_tokens,
                "stats": self._client_stats[client_id].to_dict(),
            }
        return None

    def reset(self) -> None:
        """Reseta o rate limiter."""
        self._global_bucket = TokenBucket(self.rate, self.burst)
        self._client_buckets.clear()
        self._client_stats.clear()
        self.stats = RateLimiterStats()

    def reset_client(self, client_id: str) -> None:
        """Reseta rate limiter de um cliente específico."""
        with self._client_lock:
            if client_id in self._client_buckets:
                del self._client_buckets[client_id]
            if client_id in self._client_stats:
                del self._client_stats[client_id]


class SlidingWindowRateLimiter:
    """
    Rate Limiter usando algoritmo de janela deslizante.

    Mais preciso que Token Bucket para cenários que precisam
    de controle exato da taxa em uma janela de tempo.
    """

    def __init__(
        self,
        name: str,
        max_requests: int,
        window_seconds: float,
        raise_on_limit: bool = True,
    ):
        """
        Inicializa o rate limiter.

        Args:
            name: Nome identificador.
            max_requests: Número máximo de requisições na janela.
            window_seconds: Tamanho da janela em segundos.
            raise_on_limit: Se True, lança exceção quando limite excedido.
        """
        self.name = name
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.raise_on_limit = raise_on_limit

        self._requests: list = []
        self._lock = threading.Lock()
        self.stats = RateLimiterStats()

    def _clean_old_requests(self) -> None:
        """Remove requisições antigas da janela."""
        cutoff = time.time() - self.window_seconds
        self._requests = [t for t in self._requests if t > cutoff]

    def acquire(self) -> bool:
        """
        Tenta adquirir permissão para prosseguir.

        Returns:
            True se permissão concedida, False caso contrário.

        Raises:
            RateLimitExceeded: Se raise_on_limit=True e limite excedido.
        """
        with self._lock:
            self._clean_old_requests()

            if len(self._requests) >= self.max_requests:
                self.stats.record_request(False)
                if self.raise_on_limit:
                    oldest = min(self._requests) if self._requests else time.time()
                    retry_after = oldest + self.window_seconds - time.time()
                    raise RateLimitExceeded(
                        self.name,
                        max(0, retry_after),
                        len(self._requests) / self.window_seconds
                    )
                return False

            self._requests.append(time.time())
            self.stats.record_request(True)
            return True

    def get_remaining(self) -> int:
        """Retorna número de requisições restantes na janela."""
        with self._lock:
            self._clean_old_requests()
            return max(0, self.max_requests - len(self._requests))

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas."""
        with self._lock:
            self._clean_old_requests()
            return {
                "name": self.name,
                "max_requests": self.max_requests,
                "window_seconds": self.window_seconds,
                "current_requests": len(self._requests),
                "remaining": self.max_requests - len(self._requests),
                "stats": self.stats.to_dict(),
            }

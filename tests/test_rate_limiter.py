"""
Testes para o Rate Limiter.
"""

import pytest
import time
import threading
from aurora_monitor.protection.rate_limiter import (
    RateLimiter,
    RateLimitExceeded,
    SlidingWindowRateLimiter,
)


class TestRateLimiter:
    """Testes do RateLimiter (Token Bucket)."""

    def test_allows_requests_within_limit(self):
        """Deve permitir requisições dentro do limite."""
        limiter = RateLimiter("test", rate=10, burst=10, raise_on_limit=False)

        # Deve permitir burst inicial
        for _ in range(10):
            assert limiter.acquire() is True

    def test_blocks_requests_over_limit(self):
        """Deve bloquear requisições acima do limite."""
        limiter = RateLimiter("test", rate=5, burst=5, raise_on_limit=False)

        # Esgota o burst
        for _ in range(5):
            limiter.acquire()

        # Próxima deve ser bloqueada
        assert limiter.acquire() is False

    def test_raises_exception_when_configured(self):
        """Deve lançar exceção quando configurado."""
        limiter = RateLimiter("test", rate=1, burst=1, raise_on_limit=True)

        # Primeira passa
        limiter.acquire()

        # Segunda lança exceção
        with pytest.raises(RateLimitExceeded) as exc_info:
            limiter.acquire()

        assert exc_info.value.limiter_name == "test"

    def test_refills_over_time(self):
        """Deve reabastecer tokens ao longo do tempo."""
        limiter = RateLimiter("test", rate=10, burst=5, raise_on_limit=False)

        # Esgota o burst
        for _ in range(5):
            limiter.acquire()

        # Aguarda reabastecimento (0.5s = 5 tokens a 10/s)
        time.sleep(0.5)

        # Deve ter tokens novamente
        assert limiter.acquire() is True

    def test_per_client_limiting(self):
        """Deve limitar por cliente."""
        limiter = RateLimiter(
            "test",
            rate=100,
            burst=100,
            per_client_rate=2,
            per_client_burst=2,
            raise_on_limit=False
        )

        # Cliente 1 usa seus tokens
        assert limiter.acquire(client_id="client1") is True
        assert limiter.acquire(client_id="client1") is True
        assert limiter.acquire(client_id="client1") is False

        # Cliente 2 ainda tem tokens
        assert limiter.acquire(client_id="client2") is True

    def test_decorator_usage(self):
        """Deve funcionar como decorator."""
        limiter = RateLimiter("test", rate=2, burst=2, raise_on_limit=False)
        call_count = 0

        @limiter
        def limited_function():
            nonlocal call_count
            call_count += 1
            return "success"

        # Primeiras devem passar
        assert limited_function() == "success"
        assert limited_function() == "success"

        # Terceira deve falhar (rate limit)
        with pytest.raises(RateLimitExceeded):
            limited_function()

    def test_get_wait_time(self):
        """Deve retornar tempo de espera correto."""
        limiter = RateLimiter("test", rate=10, burst=1)

        # Esgota tokens
        limiter.acquire()

        # Deve ter tempo de espera > 0
        wait_time = limiter.get_wait_time()
        assert wait_time > 0
        assert wait_time <= 0.1  # ~0.1s para 1 token a 10/s

    def test_stats_tracking(self):
        """Deve rastrear estatísticas."""
        limiter = RateLimiter("test", rate=5, burst=3, raise_on_limit=False)

        # Algumas requisições aceitas
        for _ in range(3):
            limiter.acquire()

        # Algumas rejeitadas
        for _ in range(2):
            limiter.acquire()

        stats = limiter.get_stats()
        assert stats["stats"]["accepted_requests"] == 3
        assert stats["stats"]["rejected_requests"] == 2

    def test_reset(self):
        """Reset deve restaurar tokens."""
        limiter = RateLimiter("test", rate=5, burst=5, raise_on_limit=False)

        # Esgota tokens
        for _ in range(5):
            limiter.acquire()

        assert limiter.acquire() is False

        # Reset
        limiter.reset()

        # Deve ter tokens novamente
        assert limiter.acquire() is True

    def test_thread_safety(self):
        """Deve ser thread-safe."""
        limiter = RateLimiter("test", rate=100, burst=50, raise_on_limit=False)
        results = []

        def worker():
            for _ in range(20):
                result = limiter.acquire()
                results.append(result)

        threads = [threading.Thread(target=worker) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # 100 tentativas, máximo 50 aceitas (burst)
        accepted = sum(1 for r in results if r)
        assert accepted <= 50


class TestSlidingWindowRateLimiter:
    """Testes do SlidingWindowRateLimiter."""

    def test_allows_requests_within_window(self):
        """Deve permitir requisições dentro da janela."""
        limiter = SlidingWindowRateLimiter(
            "test",
            max_requests=5,
            window_seconds=1.0,
            raise_on_limit=False
        )

        for _ in range(5):
            assert limiter.acquire() is True

    def test_blocks_requests_over_limit(self):
        """Deve bloquear requisições acima do limite."""
        limiter = SlidingWindowRateLimiter(
            "test",
            max_requests=3,
            window_seconds=1.0,
            raise_on_limit=False
        )

        for _ in range(3):
            limiter.acquire()

        assert limiter.acquire() is False

    def test_allows_after_window_expires(self):
        """Deve permitir após expiração da janela."""
        limiter = SlidingWindowRateLimiter(
            "test",
            max_requests=2,
            window_seconds=0.1,
            raise_on_limit=False
        )

        # Esgota o limite
        limiter.acquire()
        limiter.acquire()

        # Aguarda janela expirar
        time.sleep(0.15)

        # Deve permitir novamente
        assert limiter.acquire() is True

    def test_get_remaining(self):
        """Deve retornar requisições restantes."""
        limiter = SlidingWindowRateLimiter(
            "test",
            max_requests=5,
            window_seconds=1.0,
            raise_on_limit=False
        )

        assert limiter.get_remaining() == 5

        limiter.acquire()
        limiter.acquire()

        assert limiter.get_remaining() == 3

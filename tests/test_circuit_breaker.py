"""
Testes para o Circuit Breaker.
"""

import pytest
import time
from aurora_monitor.protection.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerError,
)


class TestCircuitBreaker:
    """Testes do CircuitBreaker."""

    def test_initial_state_is_closed(self):
        """Estado inicial deve ser CLOSED."""
        cb = CircuitBreaker("test", failure_threshold=3)
        assert cb.state == CircuitState.CLOSED
        assert cb.is_closed()

    def test_opens_after_failure_threshold(self):
        """Deve abrir após atingir threshold de falhas."""
        cb = CircuitBreaker("test", failure_threshold=3)

        for _ in range(3):
            try:
                with cb:
                    raise Exception("Test error")
            except Exception:
                pass

        assert cb.state == CircuitState.OPEN
        assert cb.is_open()

    def test_blocks_calls_when_open(self):
        """Deve bloquear chamadas quando aberto."""
        cb = CircuitBreaker("test", failure_threshold=1, timeout=10)

        # Causa uma falha para abrir
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        # Próxima chamada deve ser bloqueada
        with pytest.raises(CircuitBreakerError) as exc_info:
            with cb:
                pass

        assert exc_info.value.state == CircuitState.OPEN

    def test_transitions_to_half_open_after_timeout(self):
        """Deve transicionar para HALF_OPEN após timeout."""
        cb = CircuitBreaker("test", failure_threshold=1, timeout=0.1)

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        assert cb.state == CircuitState.OPEN

        # Aguarda timeout
        time.sleep(0.15)

        # Deve estar HALF_OPEN
        assert cb.state == CircuitState.HALF_OPEN

    def test_closes_after_success_in_half_open(self):
        """Deve fechar após sucesso em HALF_OPEN."""
        cb = CircuitBreaker("test", failure_threshold=1, success_threshold=1, timeout=0.1)

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        # Aguarda timeout
        time.sleep(0.15)

        # Sucesso em HALF_OPEN
        with cb:
            pass

        assert cb.state == CircuitState.CLOSED

    def test_reopens_after_failure_in_half_open(self):
        """Deve reabrir após falha em HALF_OPEN."""
        cb = CircuitBreaker("test", failure_threshold=1, timeout=0.1)

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        # Aguarda timeout
        time.sleep(0.15)

        # Falha em HALF_OPEN
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        assert cb.state == CircuitState.OPEN

    def test_decorator_usage(self):
        """Deve funcionar como decorator."""
        cb = CircuitBreaker("test", failure_threshold=3)

        @cb
        def failing_function():
            raise ValueError("Test error")

        for _ in range(3):
            try:
                failing_function()
            except ValueError:
                pass

        assert cb.is_open()

        with pytest.raises(CircuitBreakerError):
            failing_function()

    def test_fallback_function(self):
        """Deve chamar fallback quando circuito está aberto."""
        fallback_value = {"fallback": True}
        cb = CircuitBreaker(
            "test",
            failure_threshold=1,
            fallback=lambda: fallback_value
        )

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        # Deve retornar fallback
        result = cb.call(lambda: "original")
        assert result == fallback_value

    def test_excluded_exceptions(self):
        """Exceções excluídas não devem contar como falha."""
        cb = CircuitBreaker(
            "test",
            failure_threshold=1,
            excluded_exceptions=[ValueError]
        )

        # ValueError não deve contar
        try:
            with cb:
                raise ValueError("Excluded")
        except ValueError:
            pass

        assert cb.state == CircuitState.CLOSED

        # Outras exceções contam
        try:
            with cb:
                raise RuntimeError("Not excluded")
        except RuntimeError:
            pass

        assert cb.state == CircuitState.OPEN

    def test_stats_tracking(self):
        """Deve rastrear estatísticas corretamente."""
        cb = CircuitBreaker("test", failure_threshold=5)

        # Algumas chamadas bem-sucedidas
        for _ in range(3):
            with cb:
                pass

        # Algumas falhas
        for _ in range(2):
            try:
                with cb:
                    raise Exception("Error")
            except Exception:
                pass

        stats = cb.get_stats()
        assert stats["stats"]["total_calls"] == 5
        assert stats["stats"]["successful_calls"] == 3
        assert stats["stats"]["failed_calls"] == 2

    def test_reset(self):
        """Reset deve retornar ao estado CLOSED."""
        cb = CircuitBreaker("test", failure_threshold=1)

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        assert cb.is_open()

        # Reset
        cb.reset()

        assert cb.is_closed()

    def test_on_state_change_callback(self):
        """Deve chamar callback quando estado muda."""
        state_changes = []

        def callback(old, new):
            state_changes.append((old, new))

        cb = CircuitBreaker(
            "test",
            failure_threshold=1,
            on_state_change=callback
        )

        # Causa falha para abrir
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        assert len(state_changes) == 1
        assert state_changes[0] == (CircuitState.CLOSED, CircuitState.OPEN)

    def test_time_until_retry(self):
        """Deve retornar tempo correto até retry."""
        cb = CircuitBreaker("test", failure_threshold=1, timeout=10)

        # Estado CLOSED
        assert cb.time_until_retry() == 0.0

        # Abre o circuito
        try:
            with cb:
                raise Exception("Test error")
        except Exception:
            pass

        # Deve ter tempo até retry
        retry_time = cb.time_until_retry()
        assert 9 < retry_time <= 10

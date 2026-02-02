"""Protection module - Mecanismos de proteção contra falhas."""

from aurora_monitor.protection.circuit_breaker import CircuitBreaker, CircuitState, CircuitBreakerError
from aurora_monitor.protection.rate_limiter import RateLimiter, RateLimitExceeded

__all__ = ["CircuitBreaker", "CircuitState", "CircuitBreakerError", "RateLimiter", "RateLimitExceeded"]

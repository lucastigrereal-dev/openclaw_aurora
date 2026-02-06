#!/usr/bin/env python3
"""
Exemplo de integração do Aurora Monitor com Flask.

Para executar:
    pip install flask aurora-monitor
    python flask_integration.py

Endpoints:
    GET /           - Página principal
    GET /health     - Health check
    GET /metrics    - Métricas do sistema
    GET /api/data   - API protegida por circuit breaker e rate limiter
"""

try:
    from flask import Flask, jsonify, request, g
except ImportError:
    print("Flask não está instalado. Execute: pip install flask")
    exit(1)

import time
import random
from functools import wraps

from aurora_monitor import AuroraMonitor, MonitorConfig
from aurora_monitor.protection import CircuitBreakerError, RateLimitExceeded
from aurora_monitor.utils.logger import RequestLogger

# Inicializa Flask
app = Flask(__name__)

# Inicializa Aurora Monitor
config = MonitorConfig(
    app_name="flask-example",
    environment="development",
)
monitor = AuroraMonitor(config)

# Logger de requisições
request_logger = RequestLogger()

# Circuit breakers
cb_database = monitor.create_circuit_breaker("database", failure_threshold=3, timeout=10)
cb_external = monitor.create_circuit_breaker("external-api", failure_threshold=5, timeout=30)

# Rate limiters
rl_global = monitor.create_rate_limiter("global", requests_per_second=100, burst_size=150)
rl_api = monitor.create_rate_limiter("api", requests_per_second=10, burst_size=20)


# Middleware para logging e rate limiting
@app.before_request
def before_request():
    """Executa antes de cada requisição."""
    g.start_time = time.time()
    g.request_id = request_logger.log_request_start(
        method=request.method,
        path=request.path,
        client_ip=request.remote_addr,
    )

    # Rate limiting global
    try:
        rl_global.acquire()
    except RateLimitExceeded as e:
        return jsonify({
            "error": "Rate limit exceeded",
            "retry_after": e.retry_after,
        }), 429


@app.after_request
def after_request(response):
    """Executa após cada requisição."""
    duration_ms = (time.time() - g.start_time) * 1000
    request_logger.log_request_end(
        method=request.method,
        path=request.path,
        status_code=response.status_code,
        duration_ms=duration_ms,
    )
    return response


# Health checks
def check_database():
    """Verifica conexão com banco de dados."""
    # Simula verificação
    return random.random() > 0.05


def check_cache():
    """Verifica conexão com cache."""
    return True


def check_external_api():
    """Verifica API externa."""
    return not cb_external.is_open()


# Registra health checks
monitor.register_health_check("database", check_database)
monitor.register_health_check("cache", check_cache)
monitor.register_health_check("external_api", check_external_api)


# Decorator para rate limiting de API
def rate_limited(limiter_name="api"):
    """Decorator para aplicar rate limiting."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            limiter = monitor._rate_limiters.get(limiter_name)
            if limiter:
                try:
                    # Usa IP como client_id
                    client_id = request.remote_addr
                    limiter.acquire(client_id=client_id)
                except RateLimitExceeded as e:
                    return jsonify({
                        "error": "API rate limit exceeded",
                        "retry_after": e.retry_after,
                    }), 429
            return f(*args, **kwargs)
        return wrapper
    return decorator


# Rotas

@app.route("/")
def index():
    """Página principal."""
    return jsonify({
        "app": "Aurora Monitor + Flask Example",
        "endpoints": {
            "/health": "Health check",
            "/metrics": "System metrics",
            "/api/data": "Protected API endpoint",
            "/api/simulate-error": "Simulates errors (for testing)",
        }
    })


@app.route("/health")
def health():
    """Endpoint de health check."""
    results = monitor.run_health_checks()
    all_healthy = all(results.values()) if results else True

    return jsonify({
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": results,
    }), 200 if all_healthy else 503


@app.route("/metrics")
def metrics():
    """Endpoint de métricas."""
    return jsonify(monitor.get_metrics())


@app.route("/status")
def status():
    """Status do monitor."""
    return jsonify(monitor.get_status())


@app.route("/api/data")
@rate_limited("api")
def get_data():
    """
    API protegida por circuit breaker e rate limiter.
    """
    try:
        # Usa circuit breaker para acessar "banco de dados"
        with cb_database:
            # Simula consulta ao banco
            time.sleep(random.uniform(0.01, 0.05))

            if random.random() < 0.1:  # 10% de chance de erro
                raise Exception("Database connection error")

            data = {
                "id": random.randint(1, 1000),
                "value": random.random() * 100,
                "timestamp": time.time(),
            }

        return jsonify({
            "success": True,
            "data": data,
        })

    except CircuitBreakerError as e:
        return jsonify({
            "success": False,
            "error": "Service temporarily unavailable",
            "retry_after": e.retry_after,
            "circuit_breaker": e.name,
        }), 503

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500


@app.route("/api/external")
@rate_limited("api")
def call_external():
    """
    Chama API externa com circuit breaker.
    """
    try:
        with cb_external:
            # Simula chamada externa
            time.sleep(random.uniform(0.1, 0.3))

            if random.random() < 0.2:  # 20% de chance de erro
                raise ConnectionError("External API timeout")

            return jsonify({
                "success": True,
                "external_data": {
                    "status": "ok",
                    "value": random.randint(1, 100),
                }
            })

    except CircuitBreakerError as e:
        return jsonify({
            "success": False,
            "error": "External service unavailable",
            "fallback": {"status": "cached", "value": 42},
        }), 503

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
        }), 502


@app.route("/api/simulate-error", methods=["POST"])
def simulate_error():
    """
    Simula erros para testar circuit breaker.
    """
    error_type = request.json.get("type", "database")

    if error_type == "database":
        cb_database.stats.record_failure()
    elif error_type == "external":
        cb_external.stats.record_failure()

    return jsonify({
        "simulated": error_type,
        "cb_states": {
            "database": cb_database.state.value,
            "external": cb_external.state.value,
        }
    })


@app.route("/circuit-breakers")
def circuit_breakers():
    """Status dos circuit breakers."""
    return jsonify({
        name: cb.get_stats()
        for name, cb in monitor._circuit_breakers.items()
    })


# Inicialização e encerramento

def startup():
    """Inicia o monitor."""
    monitor.start()
    print(f"Aurora Monitor started for {config.app_name}")


def shutdown():
    """Para o monitor."""
    monitor.stop()
    print("Aurora Monitor stopped")


if __name__ == "__main__":
    import atexit

    startup()
    atexit.register(shutdown)

    print("\nFlask + Aurora Monitor Example")
    print("=" * 40)
    print("Endpoints:")
    print("  GET  /              - Info")
    print("  GET  /health        - Health check")
    print("  GET  /metrics       - Metrics")
    print("  GET  /api/data      - Protected API")
    print("  GET  /api/external  - External API")
    print("  GET  /circuit-breakers - CB status")
    print("=" * 40)

    app.run(host="0.0.0.0", port=5000, debug=False)

#!/usr/bin/env python3
"""
Exemplo básico de uso do Aurora Monitor.

Este exemplo demonstra como configurar e usar o Aurora Monitor
para monitorar uma aplicação e prevenir crashes.
"""

import time
import random
from aurora_monitor import (
    AuroraMonitor,
    MonitorConfig,
    MetricsConfig,
    AlertLevel,
)
from aurora_monitor.protection import CircuitBreaker, RateLimiter, RateLimitExceeded


def simulate_external_api():
    """Simula chamada a uma API externa que pode falhar."""
    if random.random() < 0.3:  # 30% de chance de falha
        raise ConnectionError("API externa não disponível")
    time.sleep(random.uniform(0.1, 0.3))
    return {"status": "success", "data": random.randint(1, 100)}


def check_database():
    """Simula health check do banco de dados."""
    return random.random() > 0.1  # 90% de chance de sucesso


def check_cache():
    """Simula health check do cache."""
    return True  # Sempre saudável


def main():
    print("=" * 60)
    print("Aurora Monitor - Exemplo Básico")
    print("=" * 60)

    # 1. Configuração
    config = MonitorConfig(
        app_name="exemplo-basico",
        environment="development",
        metrics=MetricsConfig(
            cpu_threshold=80.0,
            memory_threshold=85.0,
            collection_interval=2.0,
        ),
    )

    # 2. Inicializa o monitor
    monitor = AuroraMonitor(config)
    monitor.start()

    print("\n[1] Monitor iniciado")
    print(f"    App: {config.app_name}")
    print(f"    Environment: {config.environment}")

    # 3. Registra health checks
    monitor.register_health_check("database", check_database)
    monitor.register_health_check("cache", check_cache)

    print("\n[2] Health checks registrados:")
    print("    - database")
    print("    - cache")

    # 4. Cria circuit breaker
    api_cb = monitor.create_circuit_breaker(
        name="external-api",
        failure_threshold=3,
        timeout=5.0,
    )

    print("\n[3] Circuit breaker criado: external-api")
    print("    - Failure threshold: 3")
    print("    - Timeout: 5s")

    # 5. Cria rate limiter
    rate_limiter = monitor.create_rate_limiter(
        name="requests",
        requests_per_second=5.0,
        burst_size=10,
    )

    print("\n[4] Rate limiter criado: requests")
    print("    - Rate: 5 req/s")
    print("    - Burst: 10")

    # 6. Registra callback para anomalias
    def on_anomaly(anomalies):
        for anomaly in anomalies:
            print(f"    [!] Anomalia detectada: {anomaly}")

    monitor.on_anomaly(on_anomaly)

    print("\n[5] Callback de anomalias registrado")

    # 7. Simula operações
    print("\n[6] Simulando operações...")
    print("-" * 40)

    success_count = 0
    failure_count = 0
    rate_limited_count = 0

    for i in range(20):
        try:
            # Tenta adquirir rate limit
            rate_limiter.acquire()

            # Chama API com circuit breaker
            with api_cb:
                result = simulate_external_api()
                success_count += 1
                print(f"    [{i+1:2d}] Sucesso: {result['data']}")

        except RateLimitExceeded:
            rate_limited_count += 1
            print(f"    [{i+1:2d}] Rate limit excedido")

        except Exception as e:
            failure_count += 1
            print(f"    [{i+1:2d}] Falha: {type(e).__name__}")

        time.sleep(0.1)

    # 8. Mostra estatísticas
    print("-" * 40)
    print(f"\n[7] Estatísticas:")
    print(f"    Sucesso: {success_count}")
    print(f"    Falhas: {failure_count}")
    print(f"    Rate Limited: {rate_limited_count}")

    # 9. Status do circuit breaker
    cb_stats = api_cb.get_stats()
    print(f"\n[8] Circuit Breaker Status:")
    print(f"    Estado: {cb_stats['state']}")
    print(f"    Total calls: {cb_stats['stats']['total_calls']}")
    print(f"    Success rate: {cb_stats['stats']['success_rate']:.1%}")

    # 10. Health check
    print("\n[9] Health Checks:")
    results = monitor.run_health_checks()
    for name, passed in results.items():
        status = "PASS" if passed else "FAIL"
        print(f"    {name}: {status}")

    # 11. Métricas do sistema
    print("\n[10] Métricas do Sistema:")
    metrics = monitor.get_metrics()
    if "system" in metrics:
        print(f"    CPU: {metrics['system']['cpu_percent']:.1f}%")
        print(f"    Memory: {metrics['system']['memory_percent']:.1f}%")
        print(f"    Disk: {metrics['system']['disk_percent']:.1f}%")

    # 12. Para o monitor
    print("\n[11] Parando monitor...")
    monitor.stop()
    print("    Monitor parado com sucesso!")

    print("\n" + "=" * 60)
    print("Exemplo concluído!")
    print("=" * 60)


if __name__ == "__main__":
    main()

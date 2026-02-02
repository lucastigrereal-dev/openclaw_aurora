#!/usr/bin/env python3
"""
Exemplo avançado de uso do Aurora Monitor.

Demonstra recursos avançados como:
- Dashboard web
- Auto-healing
- Watchdog
- Alertas
- Detecção de anomalias
"""

import time
import random
import threading
from aurora_monitor import (
    AuroraMonitor,
    MonitorConfig,
    MetricsConfig,
    AlertConfig,
    AutoHealerConfig,
    WatchdogConfig,
    DashboardConfig,
)
from aurora_monitor.alerts import AlertLevel
from aurora_monitor.dashboard import DashboardServer


def simulate_memory_pressure():
    """Simula pressão de memória criando objetos."""
    data = []
    for _ in range(100):
        data.append([random.random() for _ in range(10000)])
        time.sleep(0.01)
    del data  # Libera memória


def simulate_cpu_work():
    """Simula trabalho intensivo de CPU."""
    total = 0
    for i in range(1000000):
        total += i ** 0.5
    return total


class WorkerThread(threading.Thread):
    """Thread de trabalho que envia heartbeats."""

    def __init__(self, monitor, name):
        super().__init__(name=name, daemon=True)
        self.monitor = monitor
        self.running = True

    def run(self):
        while self.running:
            # Envia heartbeat
            self.monitor.heartbeat()

            # Simula trabalho
            time.sleep(random.uniform(0.1, 0.5))

    def stop(self):
        self.running = False


def main():
    print("=" * 60)
    print("Aurora Monitor - Exemplo Avançado")
    print("=" * 60)

    # 1. Configuração completa
    config = MonitorConfig(
        app_name="exemplo-avancado",
        environment="production",

        metrics=MetricsConfig(
            enabled=True,
            collection_interval=2.0,
            cpu_threshold=70.0,
            memory_threshold=75.0,
            disk_threshold=85.0,
        ),

        auto_healer=AutoHealerConfig(
            enabled=True,
            gc_on_memory_pressure=True,
            gc_threshold=70.0,
            max_heal_attempts=5,
        ),

        watchdog=WatchdogConfig(
            enabled=True,
            check_interval=5.0,
            heartbeat_timeout=10.0,
            deadlock_detection=True,
        ),

        alerts=AlertConfig(
            enabled=True,
            aggregate_alerts=True,
            alert_cooldown=30.0,
        ),

        dashboard=DashboardConfig(
            enabled=True,
            port=8080,
            auth_enabled=False,
        ),
    )

    # 2. Inicializa o monitor
    monitor = AuroraMonitor(config)

    # 3. Registra callbacks
    def on_anomaly(anomalies):
        for anomaly in anomalies:
            print(f"\n[ANOMALY] {anomaly.type.value}: {anomaly.message}")

    def on_alert(alert):
        print(f"\n[ALERT] [{alert.level.value}] {alert.title}: {alert.message}")

    def on_heal(action):
        print(f"\n[HEAL] {action.action_type.value}: {action.result.value}")

    monitor.on_anomaly(on_anomaly)
    monitor.on_alert(on_alert)
    monitor.on_heal(on_heal)

    # 4. Registra health checks
    monitor.register_health_check("api", lambda: random.random() > 0.05)
    monitor.register_health_check("database", lambda: random.random() > 0.02)
    monitor.register_health_check("cache", lambda: True)

    # 5. Inicia o monitor
    monitor.start()
    print("\n[1] Monitor iniciado")

    # 6. Inicia o dashboard
    dashboard = DashboardServer(monitor, config.dashboard)
    dashboard.start()
    print(f"[2] Dashboard disponível em: {dashboard.get_url()}")

    # 7. Cria circuit breakers
    cb_api = monitor.create_circuit_breaker("api-pagamento", failure_threshold=3)
    cb_db = monitor.create_circuit_breaker("database", failure_threshold=5)

    print("[3] Circuit breakers criados")

    # 8. Cria rate limiters
    rl_global = monitor.create_rate_limiter("global", requests_per_second=100)
    rl_user = monitor.create_rate_limiter("user", requests_per_second=10, per_client_rate=2)

    print("[4] Rate limiters criados")

    # 9. Inicia workers
    workers = [WorkerThread(monitor, f"worker-{i}") for i in range(3)]
    for worker in workers:
        worker.start()

    print("[5] Workers iniciados")

    # 10. Loop principal
    print("\n" + "-" * 60)
    print("Simulando operações... (Pressione Ctrl+C para parar)")
    print(f"Acesse o dashboard em: {dashboard.get_url()}")
    print("-" * 60 + "\n")

    try:
        iteration = 0
        while True:
            iteration += 1

            # Heartbeat do processo principal
            monitor.heartbeat()

            # Registra métrica customizada
            monitor.record_metric("requests_processed", iteration)

            # Simula algum trabalho
            if random.random() < 0.1:
                # 10% de chance de simular pressão de memória
                print(f"[{iteration}] Simulando pressão de memória...")
                simulate_memory_pressure()

            if random.random() < 0.05:
                # 5% de chance de trabalho intensivo de CPU
                print(f"[{iteration}] Simulando trabalho de CPU...")
                simulate_cpu_work()

            # Mostra status periodicamente
            if iteration % 10 == 0:
                status = monitor.get_status()
                metrics = monitor.get_metrics()

                print(f"\n--- Status (iteração {iteration}) ---")
                print(f"Uptime: {metrics.get('uptime_seconds', 0):.0f}s")

                if "system" in metrics:
                    print(f"CPU: {metrics['system']['cpu_percent']:.1f}%")
                    print(f"Memory: {metrics['system']['memory_percent']:.1f}%")

                print(f"Circuit Breakers: {status['circuit_breakers']}")
                print(f"Health Checks: {status['health_checks']}")

            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\nEncerrando...")

    # 11. Para workers
    for worker in workers:
        worker.stop()

    # 12. Para dashboard
    dashboard.stop()

    # 13. Para monitor
    monitor.stop()

    print("\nExemplo encerrado!")


if __name__ == "__main__":
    main()

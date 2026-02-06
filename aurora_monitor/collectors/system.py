"""
Métricas de sistema - Estruturas de dados para métricas.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
import sys


@dataclass
class CPUMetrics:
    """Métricas detalhadas de CPU."""
    percent: float = 0.0
    percent_per_core: List[float] = field(default_factory=list)
    count_logical: int = 0
    count_physical: int = 0
    frequency_current: float = 0.0
    frequency_max: float = 0.0
    load_average_1m: float = 0.0
    load_average_5m: float = 0.0
    load_average_15m: float = 0.0
    context_switches: int = 0
    interrupts: int = 0


@dataclass
class MemoryMetrics:
    """Métricas detalhadas de memória."""
    total: int = 0  # bytes
    available: int = 0
    used: int = 0
    free: int = 0
    percent: float = 0.0
    swap_total: int = 0
    swap_used: int = 0
    swap_free: int = 0
    swap_percent: float = 0.0
    buffers: int = 0
    cached: int = 0


@dataclass
class DiskMetrics:
    """Métricas detalhadas de disco."""
    total: int = 0  # bytes
    used: int = 0
    free: int = 0
    percent: float = 0.0
    read_bytes: int = 0
    write_bytes: int = 0
    read_count: int = 0
    write_count: int = 0
    read_time: int = 0  # ms
    write_time: int = 0
    partitions: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class NetworkMetrics:
    """Métricas detalhadas de rede."""
    bytes_sent: int = 0
    bytes_recv: int = 0
    packets_sent: int = 0
    packets_recv: int = 0
    errors_in: int = 0
    errors_out: int = 0
    drops_in: int = 0
    drops_out: int = 0
    connections_established: int = 0
    connections_time_wait: int = 0
    connections_close_wait: int = 0


@dataclass
class ProcessMetrics:
    """Métricas do processo atual."""
    pid: int = 0
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_rss: int = 0  # bytes
    memory_vms: int = 0
    num_threads: int = 0
    num_fds: int = 0
    open_files: int = 0
    connections: int = 0
    status: str = ""
    create_time: float = 0.0


@dataclass
class GCMetrics:
    """Métricas do Garbage Collector."""
    collections_gen0: int = 0
    collections_gen1: int = 0
    collections_gen2: int = 0
    collected_gen0: int = 0
    collected_gen1: int = 0
    collected_gen2: int = 0
    uncollectable: int = 0
    threshold_gen0: int = 0
    threshold_gen1: int = 0
    threshold_gen2: int = 0
    gc_enabled: bool = True


@dataclass
class ThreadMetrics:
    """Métricas de threads."""
    active_count: int = 0
    daemon_count: int = 0
    alive_threads: List[str] = field(default_factory=list)
    blocked_threads: List[str] = field(default_factory=list)


@dataclass
class SystemMetrics:
    """
    Métricas consolidadas do sistema.

    Esta é a estrutura principal retornada pelo MetricsCollector
    contendo todas as métricas do sistema em um único objeto.
    """
    # Timestamp
    timestamp: datetime = field(default_factory=datetime.now)

    # Métricas básicas (para compatibilidade)
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    disk_percent: float = 0.0
    network_bytes_sent: int = 0
    network_bytes_recv: int = 0

    # Métricas detalhadas
    cpu: CPUMetrics = field(default_factory=CPUMetrics)
    memory: MemoryMetrics = field(default_factory=MemoryMetrics)
    disk: DiskMetrics = field(default_factory=DiskMetrics)
    network: NetworkMetrics = field(default_factory=NetworkMetrics)
    process: ProcessMetrics = field(default_factory=ProcessMetrics)
    gc: GCMetrics = field(default_factory=GCMetrics)
    threads: ThreadMetrics = field(default_factory=ThreadMetrics)

    # Informações do sistema
    hostname: str = ""
    platform: str = ""
    python_version: str = ""
    boot_time: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "cpu_percent": self.cpu_percent,
            "memory_percent": self.memory_percent,
            "disk_percent": self.disk_percent,
            "network_bytes_sent": self.network_bytes_sent,
            "network_bytes_recv": self.network_bytes_recv,
            "cpu": {
                "percent": self.cpu.percent,
                "percent_per_core": self.cpu.percent_per_core,
                "count_logical": self.cpu.count_logical,
                "count_physical": self.cpu.count_physical,
                "load_average_1m": self.cpu.load_average_1m,
                "load_average_5m": self.cpu.load_average_5m,
                "load_average_15m": self.cpu.load_average_15m,
            },
            "memory": {
                "total": self.memory.total,
                "available": self.memory.available,
                "used": self.memory.used,
                "percent": self.memory.percent,
                "swap_percent": self.memory.swap_percent,
            },
            "disk": {
                "total": self.disk.total,
                "used": self.disk.used,
                "free": self.disk.free,
                "percent": self.disk.percent,
                "read_bytes": self.disk.read_bytes,
                "write_bytes": self.disk.write_bytes,
            },
            "network": {
                "bytes_sent": self.network.bytes_sent,
                "bytes_recv": self.network.bytes_recv,
                "packets_sent": self.network.packets_sent,
                "packets_recv": self.network.packets_recv,
                "errors_in": self.network.errors_in,
                "errors_out": self.network.errors_out,
            },
            "process": {
                "pid": self.process.pid,
                "cpu_percent": self.process.cpu_percent,
                "memory_percent": self.process.memory_percent,
                "memory_rss": self.process.memory_rss,
                "num_threads": self.process.num_threads,
            },
            "gc": {
                "collections_gen0": self.gc.collections_gen0,
                "collections_gen1": self.gc.collections_gen1,
                "collections_gen2": self.gc.collections_gen2,
            },
            "threads": {
                "active_count": self.threads.active_count,
                "daemon_count": self.threads.daemon_count,
            },
            "hostname": self.hostname,
            "platform": self.platform,
            "python_version": self.python_version,
        }

    def is_healthy(
        self,
        cpu_threshold: float = 85.0,
        memory_threshold: float = 85.0,
        disk_threshold: float = 90.0
    ) -> bool:
        """
        Verifica se o sistema está saudável baseado nos thresholds.

        Args:
            cpu_threshold: Limite de CPU em porcentagem.
            memory_threshold: Limite de memória em porcentagem.
            disk_threshold: Limite de disco em porcentagem.

        Returns:
            True se todas as métricas estão abaixo dos thresholds.
        """
        return (
            self.cpu_percent < cpu_threshold and
            self.memory_percent < memory_threshold and
            self.disk_percent < disk_threshold
        )

    def get_alerts(
        self,
        cpu_threshold: float = 85.0,
        memory_threshold: float = 85.0,
        disk_threshold: float = 90.0
    ) -> List[str]:
        """
        Retorna lista de alertas baseado nos thresholds.

        Args:
            cpu_threshold: Limite de CPU em porcentagem.
            memory_threshold: Limite de memória em porcentagem.
            disk_threshold: Limite de disco em porcentagem.

        Returns:
            Lista de mensagens de alerta.
        """
        alerts = []

        if self.cpu_percent >= cpu_threshold:
            alerts.append(f"CPU usage high: {self.cpu_percent:.1f}%")

        if self.memory_percent >= memory_threshold:
            alerts.append(f"Memory usage high: {self.memory_percent:.1f}%")

        if self.disk_percent >= disk_threshold:
            alerts.append(f"Disk usage high: {self.disk_percent:.1f}%")

        if self.network.errors_in > 0 or self.network.errors_out > 0:
            alerts.append(
                f"Network errors: in={self.network.errors_in}, out={self.network.errors_out}"
            )

        if self.gc.uncollectable > 0:
            alerts.append(f"GC uncollectable objects: {self.gc.uncollectable}")

        return alerts


@dataclass
class MetricsSample:
    """Amostra de métricas com estatísticas."""
    timestamp: datetime
    value: float
    metric_name: str
    tags: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self):
        if not isinstance(self.timestamp, datetime):
            self.timestamp = datetime.now()


@dataclass
class MetricsAggregate:
    """Agregação de métricas."""
    metric_name: str
    count: int = 0
    sum: float = 0.0
    min: float = float('inf')
    max: float = float('-inf')
    avg: float = 0.0
    std_dev: float = 0.0
    percentile_50: float = 0.0
    percentile_90: float = 0.0
    percentile_99: float = 0.0
    samples: List[float] = field(default_factory=list)

    def add_sample(self, value: float) -> None:
        """Adiciona uma amostra à agregação."""
        self.samples.append(value)
        self.count += 1
        self.sum += value
        self.min = min(self.min, value)
        self.max = max(self.max, value)
        self.avg = self.sum / self.count

    def compute_stats(self) -> None:
        """Calcula estatísticas avançadas."""
        if not self.samples:
            return

        sorted_samples = sorted(self.samples)
        n = len(sorted_samples)

        # Desvio padrão
        if n > 1:
            variance = sum((x - self.avg) ** 2 for x in sorted_samples) / (n - 1)
            self.std_dev = variance ** 0.5

        # Percentis
        def percentile(p: float) -> float:
            idx = int(p * n / 100)
            return sorted_samples[min(idx, n - 1)]

        self.percentile_50 = percentile(50)
        self.percentile_90 = percentile(90)
        self.percentile_99 = percentile(99)

"""
Coletor de métricas do sistema.
"""

import gc
import os
import sys
import socket
import threading
import time
from collections import deque
from datetime import datetime
from typing import Optional, List, Dict, Any, Callable

from aurora_monitor.core.config import MetricsConfig
from aurora_monitor.collectors.system import (
    SystemMetrics,
    CPUMetrics,
    MemoryMetrics,
    DiskMetrics,
    NetworkMetrics,
    ProcessMetrics,
    GCMetrics,
    ThreadMetrics,
    MetricsAggregate,
)

# Tenta importar psutil (opcional mas recomendado)
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False


class MetricsCollector:
    """
    Coletor de métricas do sistema.

    Coleta métricas de CPU, memória, disco, rede e processo
    em intervalos regulares. Mantém histórico para análise
    de tendências e detecção de anomalias.

    Exemplo de uso:
        collector = MetricsCollector()
        metrics = collector.collect()
        print(f"CPU: {metrics.cpu_percent}%")
        print(f"Memory: {metrics.memory_percent}%")
    """

    def __init__(self, config: Optional[MetricsConfig] = None):
        """
        Inicializa o coletor.

        Args:
            config: Configuração do coletor. Se não fornecida, usa padrões.
        """
        self.config = config or MetricsConfig()
        self._history: deque = deque(maxlen=self.config.history_size)
        self._aggregates: Dict[str, MetricsAggregate] = {}
        self._custom_collectors: Dict[str, Callable[[], float]] = {}
        self._lock = threading.Lock()
        self._last_network_io: Optional[Any] = None
        self._last_disk_io: Optional[Any] = None
        self._last_collect_time: Optional[float] = None

        # Informações estáticas do sistema
        self._hostname = socket.gethostname()
        self._platform = sys.platform
        self._python_version = sys.version.split()[0]
        self._boot_time = psutil.boot_time() if PSUTIL_AVAILABLE else 0.0

    def collect(self) -> SystemMetrics:
        """
        Coleta todas as métricas do sistema.

        Returns:
            SystemMetrics com todas as métricas coletadas.
        """
        metrics = SystemMetrics(
            timestamp=datetime.now(),
            hostname=self._hostname,
            platform=self._platform,
            python_version=self._python_version,
            boot_time=self._boot_time,
        )

        # Coleta métricas
        self._collect_cpu(metrics)
        self._collect_memory(metrics)
        self._collect_disk(metrics)
        self._collect_network(metrics)
        self._collect_gc(metrics)
        self._collect_threads(metrics)

        if self.config.include_process_metrics:
            self._collect_process(metrics)

        # Coleta métricas customizadas
        self._collect_custom(metrics)

        # Adiciona ao histórico
        with self._lock:
            self._history.append(metrics)

        # Atualiza agregações
        self._update_aggregates(metrics)

        self._last_collect_time = time.time()
        return metrics

    def _collect_cpu(self, metrics: SystemMetrics) -> None:
        """Coleta métricas de CPU."""
        if PSUTIL_AVAILABLE:
            # CPU geral
            metrics.cpu_percent = psutil.cpu_percent(interval=0.1)
            metrics.cpu.percent = metrics.cpu_percent

            # CPU por core
            metrics.cpu.percent_per_core = psutil.cpu_percent(percpu=True)

            # Contagem de CPUs
            metrics.cpu.count_logical = psutil.cpu_count(logical=True) or 1
            metrics.cpu.count_physical = psutil.cpu_count(logical=False) or 1

            # Frequência
            try:
                freq = psutil.cpu_freq()
                if freq:
                    metrics.cpu.frequency_current = freq.current
                    metrics.cpu.frequency_max = freq.max or freq.current
            except Exception:
                pass

            # Load average (Unix)
            try:
                load = os.getloadavg()
                metrics.cpu.load_average_1m = load[0]
                metrics.cpu.load_average_5m = load[1]
                metrics.cpu.load_average_15m = load[2]
            except (AttributeError, OSError):
                pass

            # Context switches e interrupts
            try:
                stats = psutil.cpu_stats()
                metrics.cpu.context_switches = stats.ctx_switches
                metrics.cpu.interrupts = stats.interrupts
            except Exception:
                pass
        else:
            # Fallback sem psutil
            try:
                load = os.getloadavg()
                metrics.cpu_percent = load[0] * 100 / os.cpu_count()
                metrics.cpu.percent = metrics.cpu_percent
                metrics.cpu.load_average_1m = load[0]
                metrics.cpu.load_average_5m = load[1]
                metrics.cpu.load_average_15m = load[2]
            except (AttributeError, OSError):
                pass

    def _collect_memory(self, metrics: SystemMetrics) -> None:
        """Coleta métricas de memória."""
        if PSUTIL_AVAILABLE:
            mem = psutil.virtual_memory()
            metrics.memory_percent = mem.percent
            metrics.memory.total = mem.total
            metrics.memory.available = mem.available
            metrics.memory.used = mem.used
            metrics.memory.free = mem.free
            metrics.memory.percent = mem.percent

            # Buffers e cached (Linux)
            try:
                metrics.memory.buffers = getattr(mem, 'buffers', 0)
                metrics.memory.cached = getattr(mem, 'cached', 0)
            except Exception:
                pass

            # Swap
            try:
                swap = psutil.swap_memory()
                metrics.memory.swap_total = swap.total
                metrics.memory.swap_used = swap.used
                metrics.memory.swap_free = swap.free
                metrics.memory.swap_percent = swap.percent
            except Exception:
                pass
        else:
            # Fallback: lê de /proc/meminfo no Linux
            try:
                with open('/proc/meminfo') as f:
                    meminfo = {}
                    for line in f:
                        parts = line.split()
                        if len(parts) >= 2:
                            meminfo[parts[0].rstrip(':')] = int(parts[1]) * 1024

                    metrics.memory.total = meminfo.get('MemTotal', 0)
                    metrics.memory.free = meminfo.get('MemFree', 0)
                    metrics.memory.available = meminfo.get('MemAvailable', metrics.memory.free)
                    metrics.memory.used = metrics.memory.total - metrics.memory.available
                    if metrics.memory.total > 0:
                        metrics.memory_percent = (metrics.memory.used / metrics.memory.total) * 100
                        metrics.memory.percent = metrics.memory_percent
            except Exception:
                pass

    def _collect_disk(self, metrics: SystemMetrics) -> None:
        """Coleta métricas de disco."""
        if PSUTIL_AVAILABLE:
            # Uso de disco da partição raiz
            try:
                disk = psutil.disk_usage('/')
                metrics.disk_percent = disk.percent
                metrics.disk.total = disk.total
                metrics.disk.used = disk.used
                metrics.disk.free = disk.free
                metrics.disk.percent = disk.percent
            except Exception:
                pass

            # IO de disco
            try:
                io = psutil.disk_io_counters()
                if io:
                    metrics.disk.read_bytes = io.read_bytes
                    metrics.disk.write_bytes = io.write_bytes
                    metrics.disk.read_count = io.read_count
                    metrics.disk.write_count = io.write_count
                    metrics.disk.read_time = io.read_time
                    metrics.disk.write_time = io.write_time
            except Exception:
                pass

            # Partições
            try:
                partitions = psutil.disk_partitions()
                for part in partitions:
                    try:
                        usage = psutil.disk_usage(part.mountpoint)
                        metrics.disk.partitions.append({
                            'device': part.device,
                            'mountpoint': part.mountpoint,
                            'fstype': part.fstype,
                            'total': usage.total,
                            'used': usage.used,
                            'free': usage.free,
                            'percent': usage.percent,
                        })
                    except Exception:
                        pass
            except Exception:
                pass
        else:
            # Fallback usando statvfs
            try:
                statvfs = os.statvfs('/')
                metrics.disk.total = statvfs.f_frsize * statvfs.f_blocks
                metrics.disk.free = statvfs.f_frsize * statvfs.f_bfree
                metrics.disk.used = metrics.disk.total - metrics.disk.free
                if metrics.disk.total > 0:
                    metrics.disk_percent = (metrics.disk.used / metrics.disk.total) * 100
                    metrics.disk.percent = metrics.disk_percent
            except Exception:
                pass

    def _collect_network(self, metrics: SystemMetrics) -> None:
        """Coleta métricas de rede."""
        if PSUTIL_AVAILABLE:
            try:
                io = psutil.net_io_counters()
                metrics.network_bytes_sent = io.bytes_sent
                metrics.network_bytes_recv = io.bytes_recv
                metrics.network.bytes_sent = io.bytes_sent
                metrics.network.bytes_recv = io.bytes_recv
                metrics.network.packets_sent = io.packets_sent
                metrics.network.packets_recv = io.packets_recv
                metrics.network.errors_in = io.errin
                metrics.network.errors_out = io.errout
                metrics.network.drops_in = io.dropin
                metrics.network.drops_out = io.dropout
            except Exception:
                pass

            # Conexões
            try:
                connections = psutil.net_connections(kind='inet')
                metrics.network.connections_established = sum(
                    1 for c in connections if c.status == 'ESTABLISHED'
                )
                metrics.network.connections_time_wait = sum(
                    1 for c in connections if c.status == 'TIME_WAIT'
                )
                metrics.network.connections_close_wait = sum(
                    1 for c in connections if c.status == 'CLOSE_WAIT'
                )
            except (psutil.AccessDenied, Exception):
                pass
        else:
            # Fallback: lê de /proc/net/dev no Linux
            try:
                with open('/proc/net/dev') as f:
                    for line in f:
                        if ':' in line and 'lo' not in line:
                            parts = line.split(':')[1].split()
                            if len(parts) >= 16:
                                metrics.network.bytes_recv += int(parts[0])
                                metrics.network.bytes_sent += int(parts[8])
                                metrics.network.packets_recv += int(parts[1])
                                metrics.network.packets_sent += int(parts[9])
                                metrics.network.errors_in += int(parts[2])
                                metrics.network.errors_out += int(parts[10])

                    metrics.network_bytes_sent = metrics.network.bytes_sent
                    metrics.network_bytes_recv = metrics.network.bytes_recv
            except Exception:
                pass

    def _collect_process(self, metrics: SystemMetrics) -> None:
        """Coleta métricas do processo atual."""
        if PSUTIL_AVAILABLE:
            try:
                proc = psutil.Process()
                metrics.process.pid = proc.pid
                metrics.process.cpu_percent = proc.cpu_percent()
                metrics.process.memory_percent = proc.memory_percent()

                mem_info = proc.memory_info()
                metrics.process.memory_rss = mem_info.rss
                metrics.process.memory_vms = mem_info.vms

                metrics.process.num_threads = proc.num_threads()
                metrics.process.status = proc.status()
                metrics.process.create_time = proc.create_time()

                # File descriptors (Unix)
                try:
                    metrics.process.num_fds = proc.num_fds()
                except (AttributeError, psutil.AccessDenied):
                    pass

                # Open files
                try:
                    metrics.process.open_files = len(proc.open_files())
                except (psutil.AccessDenied, Exception):
                    pass

                # Connections
                try:
                    metrics.process.connections = len(proc.connections())
                except (psutil.AccessDenied, Exception):
                    pass
            except Exception:
                pass
        else:
            metrics.process.pid = os.getpid()

    def _collect_gc(self, metrics: SystemMetrics) -> None:
        """Coleta métricas do Garbage Collector."""
        try:
            # Estatísticas de coleta
            stats = gc.get_stats()
            if len(stats) >= 3:
                metrics.gc.collections_gen0 = stats[0].get('collections', 0)
                metrics.gc.collections_gen1 = stats[1].get('collections', 0)
                metrics.gc.collections_gen2 = stats[2].get('collections', 0)
                metrics.gc.collected_gen0 = stats[0].get('collected', 0)
                metrics.gc.collected_gen1 = stats[1].get('collected', 0)
                metrics.gc.collected_gen2 = stats[2].get('collected', 0)
                metrics.gc.uncollectable = stats[2].get('uncollectable', 0)

            # Thresholds
            thresholds = gc.get_threshold()
            if len(thresholds) >= 3:
                metrics.gc.threshold_gen0 = thresholds[0]
                metrics.gc.threshold_gen1 = thresholds[1]
                metrics.gc.threshold_gen2 = thresholds[2]

            metrics.gc.gc_enabled = gc.isenabled()
        except Exception:
            pass

    def _collect_threads(self, metrics: SystemMetrics) -> None:
        """Coleta métricas de threads."""
        try:
            threads = threading.enumerate()
            metrics.threads.active_count = len(threads)
            metrics.threads.daemon_count = sum(1 for t in threads if t.daemon)
            metrics.threads.alive_threads = [t.name for t in threads if t.is_alive()]
        except Exception:
            pass

    def _collect_custom(self, metrics: SystemMetrics) -> None:
        """Coleta métricas customizadas."""
        for name, collector in self._custom_collectors.items():
            try:
                value = collector()
                # Armazena em tags customizadas ou campo específico
            except Exception:
                pass

    def _update_aggregates(self, metrics: SystemMetrics) -> None:
        """Atualiza agregações de métricas."""
        aggregate_metrics = {
            'cpu_percent': metrics.cpu_percent,
            'memory_percent': metrics.memory_percent,
            'disk_percent': metrics.disk_percent,
        }

        with self._lock:
            for name, value in aggregate_metrics.items():
                if name not in self._aggregates:
                    self._aggregates[name] = MetricsAggregate(metric_name=name)
                self._aggregates[name].add_sample(value)

    def register_collector(self, name: str, collector: Callable[[], float]) -> None:
        """
        Registra um coletor de métrica customizado.

        Args:
            name: Nome da métrica.
            collector: Função que retorna o valor da métrica.
        """
        self._custom_collectors[name] = collector

    def get_latest(self) -> Optional[SystemMetrics]:
        """
        Retorna a última métrica coletada.

        Returns:
            SystemMetrics mais recente ou None se não houver.
        """
        with self._lock:
            if self._history:
                return self._history[-1]
        return None

    def get_history(self, count: Optional[int] = None) -> List[SystemMetrics]:
        """
        Retorna histórico de métricas.

        Args:
            count: Número de amostras a retornar. Se None, retorna todas.

        Returns:
            Lista de SystemMetrics do histórico.
        """
        with self._lock:
            if count is None:
                return list(self._history)
            return list(self._history)[-count:]

    def get_aggregate(self, metric_name: str) -> Optional[MetricsAggregate]:
        """
        Retorna agregação de uma métrica.

        Args:
            metric_name: Nome da métrica.

        Returns:
            MetricsAggregate ou None se não existir.
        """
        with self._lock:
            agg = self._aggregates.get(metric_name)
            if agg:
                agg.compute_stats()
            return agg

    def clear_history(self) -> None:
        """Limpa histórico de métricas."""
        with self._lock:
            self._history.clear()
            self._aggregates.clear()

    def get_rate(self, metric_name: str) -> float:
        """
        Calcula taxa de variação de uma métrica.

        Args:
            metric_name: Nome da métrica (ex: 'network_bytes_sent').

        Returns:
            Taxa de variação por segundo.
        """
        with self._lock:
            if len(self._history) < 2:
                return 0.0

            latest = self._history[-1]
            previous = self._history[-2]

            # Obtém valores usando getattr
            latest_value = getattr(latest, metric_name, 0)
            previous_value = getattr(previous, metric_name, 0)

            # Calcula intervalo de tempo
            time_diff = (latest.timestamp - previous.timestamp).total_seconds()
            if time_diff <= 0:
                return 0.0

            return (latest_value - previous_value) / time_diff

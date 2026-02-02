"""
Sistema de Detecção de Anomalias.

Detecta padrões anormais em métricas usando múltiplos algoritmos:
- Z-Score para detectar outliers
- Moving Average para detectar tendências
- Spike Detection para detectar picos súbitos
- Pattern Recognition para detectar padrões cíclicos anormais
"""

import math
import threading
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple

from aurora_monitor.core.config import AnomalyConfig
from aurora_monitor.collectors.system import SystemMetrics


class AnomalyType(Enum):
    """Tipos de anomalias detectáveis."""
    SPIKE = "spike"  # Pico súbito
    DROP = "drop"  # Queda súbita
    TREND_UP = "trend_up"  # Tendência de alta
    TREND_DOWN = "trend_down"  # Tendência de baixa
    OUTLIER = "outlier"  # Valor fora do padrão
    THRESHOLD = "threshold"  # Valor acima do threshold
    PATTERN = "pattern"  # Padrão anormal
    CORRELATION = "correlation"  # Correlação anormal entre métricas
    FREQUENCY = "frequency"  # Frequência anormal de eventos
    MEMORY_LEAK = "memory_leak"  # Potencial vazamento de memória
    CPU_SATURATION = "cpu_saturation"  # Saturação de CPU
    DISK_EXHAUSTION = "disk_exhaustion"  # Disco esgotando


class AnomalySeverity(Enum):
    """Severidade das anomalias."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """Representa uma anomalia detectada."""
    type: AnomalyType
    severity: AnomalySeverity
    metric_name: str
    current_value: float
    expected_value: float
    deviation: float  # Quanto desvia do esperado
    timestamp: datetime = field(default_factory=datetime.now)
    message: str = ""
    context: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Converte para dicionário."""
        return {
            "type": self.type.value,
            "severity": self.severity.value,
            "metric_name": self.metric_name,
            "current_value": self.current_value,
            "expected_value": self.expected_value,
            "deviation": self.deviation,
            "timestamp": self.timestamp.isoformat(),
            "message": self.message,
            "context": self.context,
        }

    def __str__(self) -> str:
        return (
            f"[{self.severity.value.upper()}] {self.type.value}: "
            f"{self.metric_name}={self.current_value:.2f} "
            f"(expected={self.expected_value:.2f}, deviation={self.deviation:.2f})"
        )


@dataclass
class MetricBaseline:
    """Baseline estatístico de uma métrica."""
    metric_name: str
    samples: deque = field(default_factory=lambda: deque(maxlen=1000))
    mean: float = 0.0
    std_dev: float = 0.0
    min_value: float = float('inf')
    max_value: float = float('-inf')
    last_update: datetime = field(default_factory=datetime.now)

    def add_sample(self, value: float) -> None:
        """Adiciona uma amostra e recalcula estatísticas."""
        self.samples.append(value)
        self.min_value = min(self.min_value, value)
        self.max_value = max(self.max_value, value)
        self._recalculate()
        self.last_update = datetime.now()

    def _recalculate(self) -> None:
        """Recalcula média e desvio padrão."""
        if not self.samples:
            return

        n = len(self.samples)
        self.mean = sum(self.samples) / n

        if n > 1:
            variance = sum((x - self.mean) ** 2 for x in self.samples) / (n - 1)
            self.std_dev = math.sqrt(variance)
        else:
            self.std_dev = 0.0

    def get_z_score(self, value: float) -> float:
        """Calcula Z-score de um valor."""
        if self.std_dev == 0:
            return 0.0
        return (value - self.mean) / self.std_dev

    def is_outlier(self, value: float, threshold: float = 2.0) -> bool:
        """Verifica se valor é outlier baseado em Z-score."""
        return abs(self.get_z_score(value)) > threshold


class AnomalyDetector:
    """
    Detector de anomalias multi-algoritmo.

    Usa múltiplas técnicas para detectar diferentes tipos de anomalias:
    - Análise estatística (Z-score, desvio padrão)
    - Detecção de tendências (moving average)
    - Detecção de spikes (variação súbita)
    - Análise de padrões (sazonalidade, ciclos)

    Exemplo de uso:
        detector = AnomalyDetector()

        for metrics in stream_of_metrics:
            detector.add_sample(metrics)
            anomalies = detector.detect()
            for anomaly in anomalies:
                print(f"Anomalia: {anomaly}")
    """

    def __init__(self, config: Optional[AnomalyConfig] = None):
        """
        Inicializa o detector.

        Args:
            config: Configuração do detector.
        """
        self.config = config or AnomalyConfig()
        self._lock = threading.Lock()

        # Baselines por métrica
        self._baselines: Dict[str, MetricBaseline] = {}

        # Histórico de amostras
        self._samples: deque = deque(maxlen=self.config.min_samples * 10)

        # Cache de anomalias recentes (evita duplicatas)
        self._recent_anomalies: Dict[str, datetime] = {}
        self._anomaly_cooldown = timedelta(seconds=60)

        # Métricas monitoradas
        self._monitored_metrics = [
            'cpu_percent',
            'memory_percent',
            'disk_percent',
            'network_bytes_sent',
            'network_bytes_recv',
        ]

        # Thresholds críticos
        self._critical_thresholds = {
            'cpu_percent': 95.0,
            'memory_percent': 95.0,
            'disk_percent': 98.0,
        }

    def add_sample(self, metrics: SystemMetrics) -> None:
        """
        Adiciona uma amostra de métricas.

        Args:
            metrics: SystemMetrics coletadas.
        """
        with self._lock:
            self._samples.append(metrics)

            # Atualiza baselines
            for metric_name in self._monitored_metrics:
                value = self._get_metric_value(metrics, metric_name)
                if value is not None:
                    if metric_name not in self._baselines:
                        self._baselines[metric_name] = MetricBaseline(metric_name=metric_name)
                    self._baselines[metric_name].add_sample(value)

    def detect(self) -> List[Anomaly]:
        """
        Detecta anomalias nas amostras coletadas.

        Returns:
            Lista de anomalias detectadas.
        """
        anomalies = []

        with self._lock:
            if len(self._samples) < self.config.min_samples:
                return anomalies

            latest = self._samples[-1]

            # Detecta diferentes tipos de anomalias
            anomalies.extend(self._detect_threshold_violations(latest))
            anomalies.extend(self._detect_outliers(latest))
            anomalies.extend(self._detect_spikes())
            anomalies.extend(self._detect_trends())
            anomalies.extend(self._detect_memory_leak())
            anomalies.extend(self._detect_correlations())

            # Filtra duplicatas recentes
            anomalies = self._filter_recent(anomalies)

        return anomalies

    def _get_metric_value(self, metrics: SystemMetrics, name: str) -> Optional[float]:
        """Obtém valor de uma métrica pelo nome."""
        return getattr(metrics, name, None)

    def _detect_threshold_violations(self, metrics: SystemMetrics) -> List[Anomaly]:
        """Detecta violações de thresholds críticos."""
        anomalies = []

        for metric_name, threshold in self._critical_thresholds.items():
            value = self._get_metric_value(metrics, metric_name)
            if value is not None and value >= threshold:
                severity = AnomalySeverity.CRITICAL if value >= 99 else AnomalySeverity.HIGH

                anomaly_type = {
                    'cpu_percent': AnomalyType.CPU_SATURATION,
                    'memory_percent': AnomalyType.THRESHOLD,
                    'disk_percent': AnomalyType.DISK_EXHAUSTION,
                }.get(metric_name, AnomalyType.THRESHOLD)

                anomalies.append(Anomaly(
                    type=anomaly_type,
                    severity=severity,
                    metric_name=metric_name,
                    current_value=value,
                    expected_value=threshold,
                    deviation=value - threshold,
                    message=f"{metric_name} exceeded critical threshold: {value:.1f}% >= {threshold}%",
                ))

        return anomalies

    def _detect_outliers(self, metrics: SystemMetrics) -> List[Anomaly]:
        """Detecta outliers usando Z-score."""
        anomalies = []

        for metric_name, baseline in self._baselines.items():
            if len(baseline.samples) < self.config.min_samples:
                continue

            value = self._get_metric_value(metrics, metric_name)
            if value is None:
                continue

            z_score = baseline.get_z_score(value)

            if abs(z_score) > self.config.sensitivity:
                severity = self._z_score_to_severity(abs(z_score))
                anomalies.append(Anomaly(
                    type=AnomalyType.OUTLIER,
                    severity=severity,
                    metric_name=metric_name,
                    current_value=value,
                    expected_value=baseline.mean,
                    deviation=z_score,
                    message=f"{metric_name} is {abs(z_score):.1f} standard deviations from mean",
                    context={"z_score": z_score, "mean": baseline.mean, "std_dev": baseline.std_dev},
                ))

        return anomalies

    def _detect_spikes(self) -> List[Anomaly]:
        """Detecta picos súbitos nas métricas."""
        anomalies = []

        if len(self._samples) < 3:
            return anomalies

        latest = self._samples[-1]
        previous = self._samples[-2]

        for metric_name in self._monitored_metrics:
            current = self._get_metric_value(latest, metric_name)
            prev = self._get_metric_value(previous, metric_name)

            if current is None or prev is None:
                continue

            # Evita divisão por zero
            if prev == 0:
                if current > 0:
                    change_ratio = float('inf')
                else:
                    continue
            else:
                change_ratio = abs(current - prev) / max(abs(prev), 1)

            if change_ratio >= self.config.spike_threshold:
                anomaly_type = AnomalyType.SPIKE if current > prev else AnomalyType.DROP
                severity = self._ratio_to_severity(change_ratio)

                anomalies.append(Anomaly(
                    type=anomaly_type,
                    severity=severity,
                    metric_name=metric_name,
                    current_value=current,
                    expected_value=prev,
                    deviation=change_ratio,
                    message=f"{metric_name} {'spiked' if current > prev else 'dropped'} by {change_ratio*100:.1f}%",
                    context={"previous_value": prev, "change_ratio": change_ratio},
                ))

        return anomalies

    def _detect_trends(self) -> List[Anomaly]:
        """Detecta tendências de alta/baixa prolongadas."""
        anomalies = []

        window_size = min(self.config.trend_window // 5, len(self._samples))
        if window_size < 10:
            return anomalies

        window = list(self._samples)[-window_size:]

        for metric_name in ['memory_percent', 'disk_percent', 'cpu_percent']:
            values = [
                self._get_metric_value(m, metric_name)
                for m in window
                if self._get_metric_value(m, metric_name) is not None
            ]

            if len(values) < 10:
                continue

            # Calcula tendência linear
            slope = self._calculate_slope(values)

            # Threshold para tendência significativa
            trend_threshold = 0.1  # 0.1% por amostra

            if abs(slope) > trend_threshold:
                anomaly_type = AnomalyType.TREND_UP if slope > 0 else AnomalyType.TREND_DOWN
                severity = AnomalySeverity.MEDIUM

                # Detecta potencial memory leak
                if metric_name == 'memory_percent' and slope > 0.05:
                    anomaly_type = AnomalyType.MEMORY_LEAK
                    severity = AnomalySeverity.HIGH

                anomalies.append(Anomaly(
                    type=anomaly_type,
                    severity=severity,
                    metric_name=metric_name,
                    current_value=values[-1],
                    expected_value=values[0],
                    deviation=slope * len(values),
                    message=f"{metric_name} showing {'upward' if slope > 0 else 'downward'} trend: {slope:.4f}/sample",
                    context={"slope": slope, "window_size": len(values)},
                ))

        return anomalies

    def _detect_memory_leak(self) -> List[Anomaly]:
        """Detecta potenciais vazamentos de memória."""
        anomalies = []

        if len(self._samples) < 100:
            return anomalies

        # Analisa últimas N amostras
        recent = list(self._samples)[-100:]
        memory_values = [
            m.memory_percent
            for m in recent
            if hasattr(m, 'memory_percent')
        ]

        if len(memory_values) < 50:
            return anomalies

        # Divide em duas metades
        first_half = memory_values[:len(memory_values)//2]
        second_half = memory_values[len(memory_values)//2:]

        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)

        # Se a segunda metade é consistentemente maior
        if second_avg > first_avg + 5:  # +5% de memória
            # Verifica se é crescimento monotônico
            increasing_count = sum(1 for i in range(1, len(memory_values)) if memory_values[i] > memory_values[i-1])
            if increasing_count > len(memory_values) * 0.7:  # 70% crescente
                anomalies.append(Anomaly(
                    type=AnomalyType.MEMORY_LEAK,
                    severity=AnomalySeverity.HIGH,
                    metric_name="memory_percent",
                    current_value=memory_values[-1],
                    expected_value=first_avg,
                    deviation=second_avg - first_avg,
                    message=f"Potential memory leak detected: memory increased from avg {first_avg:.1f}% to {second_avg:.1f}%",
                    context={
                        "first_half_avg": first_avg,
                        "second_half_avg": second_avg,
                        "increasing_ratio": increasing_count / len(memory_values),
                    },
                ))

        return anomalies

    def _detect_correlations(self) -> List[Anomaly]:
        """Detecta correlações anormais entre métricas."""
        anomalies = []

        if len(self._samples) < 30:
            return anomalies

        recent = list(self._samples)[-30:]

        # Extrai séries
        cpu_values = [m.cpu_percent for m in recent]
        memory_values = [m.memory_percent for m in recent]

        # Calcula correlação
        correlation = self._calculate_correlation(cpu_values, memory_values)

        # Correlação muito alta pode indicar problema
        if correlation > 0.95:
            anomalies.append(Anomaly(
                type=AnomalyType.CORRELATION,
                severity=AnomalySeverity.MEDIUM,
                metric_name="cpu_memory_correlation",
                current_value=correlation,
                expected_value=0.5,
                deviation=correlation - 0.5,
                message=f"Abnormally high correlation between CPU and memory: {correlation:.2f}",
                context={"correlation": correlation},
            ))

        return anomalies

    def _calculate_slope(self, values: List[float]) -> float:
        """Calcula inclinação da reta de regressão linear."""
        n = len(values)
        if n < 2:
            return 0.0

        x_mean = (n - 1) / 2
        y_mean = sum(values) / n

        numerator = sum((i - x_mean) * (values[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))

        if denominator == 0:
            return 0.0

        return numerator / denominator

    def _calculate_correlation(self, x: List[float], y: List[float]) -> float:
        """Calcula coeficiente de correlação de Pearson."""
        n = len(x)
        if n != len(y) or n < 2:
            return 0.0

        x_mean = sum(x) / n
        y_mean = sum(y) / n

        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        x_std = math.sqrt(sum((xi - x_mean) ** 2 for xi in x))
        y_std = math.sqrt(sum((yi - y_mean) ** 2 for yi in y))

        if x_std == 0 or y_std == 0:
            return 0.0

        return numerator / (x_std * y_std)

    def _z_score_to_severity(self, z_score: float) -> AnomalySeverity:
        """Converte Z-score em severidade."""
        if z_score >= 4:
            return AnomalySeverity.CRITICAL
        elif z_score >= 3:
            return AnomalySeverity.HIGH
        elif z_score >= 2.5:
            return AnomalySeverity.MEDIUM
        else:
            return AnomalySeverity.LOW

    def _ratio_to_severity(self, ratio: float) -> AnomalySeverity:
        """Converte ratio de mudança em severidade."""
        if ratio >= 5:
            return AnomalySeverity.CRITICAL
        elif ratio >= 3:
            return AnomalySeverity.HIGH
        elif ratio >= 2:
            return AnomalySeverity.MEDIUM
        else:
            return AnomalySeverity.LOW

    def _filter_recent(self, anomalies: List[Anomaly]) -> List[Anomaly]:
        """Filtra anomalias já reportadas recentemente."""
        filtered = []
        now = datetime.now()

        for anomaly in anomalies:
            key = f"{anomaly.type.value}:{anomaly.metric_name}"
            last_reported = self._recent_anomalies.get(key)

            if last_reported is None or (now - last_reported) > self._anomaly_cooldown:
                filtered.append(anomaly)
                self._recent_anomalies[key] = now

        return filtered

    def get_baseline(self, metric_name: str) -> Optional[MetricBaseline]:
        """Retorna baseline de uma métrica."""
        return self._baselines.get(metric_name)

    def reset(self) -> None:
        """Reseta o detector."""
        with self._lock:
            self._samples.clear()
            self._baselines.clear()
            self._recent_anomalies.clear()

    def get_health_score(self) -> float:
        """
        Calcula score de saúde geral (0-100).

        Returns:
            Score de 0 (péssimo) a 100 (excelente).
        """
        if not self._samples:
            return 100.0

        latest = self._samples[-1]
        score = 100.0

        # Penaliza por uso de recursos
        score -= max(0, latest.cpu_percent - 50) * 0.5  # -0.5 por % acima de 50
        score -= max(0, latest.memory_percent - 50) * 0.5
        score -= max(0, latest.disk_percent - 70) * 1.0  # -1 por % acima de 70

        # Penaliza por anomalias recentes
        recent_anomalies = len([
            ts for ts in self._recent_anomalies.values()
            if (datetime.now() - ts).total_seconds() < 300
        ])
        score -= recent_anomalies * 5

        return max(0.0, min(100.0, score))

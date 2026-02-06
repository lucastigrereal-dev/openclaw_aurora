import { useEffect, useState, useCallback } from 'react';
import { getMetricsAggregator, AggregatedMetrics, SkillMetrics, MetricPoint } from '@/services/metricsAggregator';
import { useOpenClawWebSocket } from './useOpenClawWebSocket';

export function useMetricsAggregator() {
  const [metrics, setMetrics] = useState<AggregatedMetrics | null>(null);
  const [topSkills, setTopSkills] = useState<SkillMetrics[]>([]);
  const [latencyTrend, setLatencyTrend] = useState<MetricPoint[]>([]);
  const [executionTrend, setExecutionTrend] = useState<MetricPoint[]>([]);
  const [errorTrend, setErrorTrend] = useState<MetricPoint[]>([]);
  const [successRateTrend, setSuccessRateTrend] = useState<MetricPoint[]>([]);

  const aggregator = getMetricsAggregator();

  const updateMetrics = useCallback(() => {
    const currentMetrics = aggregator.getMetrics();
    setMetrics(currentMetrics);
    setTopSkills(aggregator.getTopSkills(5));
    setLatencyTrend(aggregator.getLatencyTrend(60));
    setExecutionTrend(aggregator.getExecutionTrend(60));
    setErrorTrend(aggregator.getErrorTrend(60));
    setSuccessRateTrend(aggregator.getSuccessRateTrend(60));
  }, [aggregator]);

  useOpenClawWebSocket({
    autoConnect: true,
    onEvent: (event) => {
      aggregator.processEvent(event);
      updateMetrics();
    },
  });

  useEffect(() => {
    // Atualizar métricas a cada segundo
    const interval = setInterval(updateMetrics, 1000);
    updateMetrics();

    return () => clearInterval(interval);
  }, [updateMetrics]);

  return {
    metrics,
    topSkills,
    latencyTrend,
    executionTrend,
    errorTrend,
    successRateTrend,
    reset: () => {
      aggregator.reset();
      updateMetrics();
    },
  };
}

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAuroraMonitor, AuroraMetrics, AuroraAlert } from '../services/auroraMonitor';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: string;
  uptime: string;
  lastCheck: string;
}

interface SystemResource {
  name: string;
  usage: number;
  limit: number;
  unit: string;
}

export default function Health() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([
    { name: 'Aurora Monitor', status: 'degraded', latency: '---', uptime: '---', lastCheck: 'Conectando...' },
    { name: 'Telegram Bot', status: 'degraded', latency: '---', uptime: '---', lastCheck: 'Aguardando...' },
    { name: 'Claude API', status: 'degraded', latency: '---', uptime: '---', lastCheck: 'Aguardando...' },
    { name: 'Ollama Gateway', status: 'degraded', latency: '---', uptime: '---', lastCheck: 'Aguardando...' },
    { name: 'Memory Cache', status: 'degraded', latency: '---', uptime: '---', lastCheck: 'Aguardando...' },
  ]);

  const [systemResources, setSystemResources] = useState<SystemResource[]>([
    { name: 'CPU', usage: 0, limit: 100, unit: '%' },
    { name: 'RAM', usage: 0, limit: 8, unit: 'GB' },
    { name: 'Disco', usage: 0, limit: 256, unit: 'GB' },
    { name: 'Heap JS', usage: 0, limit: 4, unit: 'GB' },
  ]);

  const [alerts, setAlerts] = useState<AuroraAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const aurora = getAuroraMonitor();

    aurora.onConnect(() => {
      setConnected(true);
      updateHealthCheck('Aurora Monitor', 'healthy', '5ms', '100%', 'Agora');
    });

    aurora.onDisconnect(() => {
      setConnected(false);
      updateHealthCheck('Aurora Monitor', 'unhealthy', '---', '---', 'Desconectado');
    });

    aurora.onMetrics((metrics: AuroraMetrics) => {
      setLastUpdate(new Date());

      // Atualiza recursos do sistema
      setSystemResources([
        { name: 'CPU', usage: metrics.cpu.percent, limit: 100, unit: '%' },
        { name: 'RAM', usage: metrics.memory.usedGb, limit: metrics.memory.totalGb, unit: 'GB' },
        { name: 'Disco', usage: metrics.disk.usedGb, limit: metrics.disk.totalGb, unit: 'GB' },
        { name: 'Heap JS', usage: metrics.memory.heapUsed / 1024 / 1024 / 1024, limit: metrics.memory.heapTotal / 1024 / 1024 / 1024, unit: 'GB' },
      ]);

      // Atualiza status dos serviços baseado nos circuit breakers
      if (metrics.circuitBreakers) {
        metrics.circuitBreakers.forEach((cb) => {
          const status = cb.state === 'closed' ? 'healthy' : cb.state === 'half-open' ? 'degraded' : 'unhealthy';
          updateHealthCheck(cb.name, status, `${cb.failures} falhas`, `${cb.successes} ok`, 'Agora');
        });
      }

      // Atualiza status dos canais protegidos
      if (metrics.channels) {
        metrics.channels.forEach((channel) => {
          const status = channel.circuitState === 'closed' ? 'healthy' : channel.circuitState === 'half-open' ? 'degraded' : 'unhealthy';
          updateHealthCheck(channel.name, status, '---', '---', 'Agora');
        });
      }
    });

    aurora.onAlert((alert: AuroraAlert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 10));
    });

    aurora.connect().catch(console.error);

    return () => {
      aurora.disconnect();
    };
  }, []);

  const updateHealthCheck = (name: string, status: 'healthy' | 'degraded' | 'unhealthy', latency: string, uptime: string, lastCheck: string) => {
    setHealthChecks((prev) => {
      const existing = prev.find((h) => h.name === name);
      if (existing) {
        return prev.map((h) => (h.name === name ? { ...h, status, latency, uptime, lastCheck } : h));
      }
      return [...prev, { name, status, latency, uptime, lastCheck }];
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'degraded':
        return <AlertCircle className="text-yellow-500" size={20} />;
      case 'unhealthy':
        return <AlertTriangle className="text-red-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const overallHealth = healthChecks.filter((h) => h.status === 'healthy').length;

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-lg p-4 ${connected ? 'border-green-500/30' : 'border-red-500/30'} border`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected ? (
              <CheckCircle className="text-green-500" size={24} />
            ) : (
              <RefreshCw className="text-red-500 animate-spin" size={24} />
            )}
            <div>
              <p className="font-semibold">{connected ? 'Aurora Monitor Conectado' : 'Conectando ao Aurora Monitor...'}</p>
              <p className="text-xs text-muted-foreground">
                {lastUpdate ? `Ultima atualização: ${lastUpdate.toLocaleTimeString()}` : 'Aguardando dados...'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            WebSocket: ws://localhost:18790
          </div>
        </div>
      </motion.div>

      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">SAUDE DO SISTEMA</h3>
            <p className="text-sm text-muted-foreground">
              {overallHealth}/{healthChecks.length} servicos saudaveis
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${overallHealth === healthChecks.length ? 'text-green-500' : overallHealth > healthChecks.length / 2 ? 'text-yellow-500' : 'text-red-500'}`}>
              {Math.round((overallHealth / healthChecks.length) * 100)}%
            </p>
            <p className="text-sm text-muted-foreground">Score geral</p>
          </div>
        </div>
      </motion.div>

      {/* System Resources */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <h3 className="font-semibold mb-6">RECURSOS DO SISTEMA</h3>
        <div className="space-y-4">
          {systemResources.map((resource, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{resource.name}</span>
                <span className="text-sm text-accent">
                  {resource.usage.toFixed(1)}/{resource.limit.toFixed(1)} {resource.unit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min((resource.usage / resource.limit) * 100, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${
                    (resource.usage / resource.limit) * 100 > 80
                      ? 'bg-red-500'
                      : (resource.usage / resource.limit) * 100 > 50
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Service Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <h3 className="font-semibold mb-6">SAUDE DOS SERVICOS</h3>
        <div className="space-y-3">
          {healthChecks.map((check, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-xs text-muted-foreground">{check.lastCheck}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">Info: {check.latency}</span>
                <span className="text-muted-foreground">Status: {check.uptime}</span>
                <span className={`font-semibold capitalize ${getStatusColor(check.status)}`}>
                  {check.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-lg p-6 neon-border border-yellow-500/30"
      >
        <h3 className="font-semibold mb-4">ALERTAS EM TEMPO REAL</h3>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm">
                <p className="font-semibold">Nenhum alerta ativo</p>
                <p className="text-xs text-muted-foreground">Sistema operando normalmente</p>
              </div>
            </div>
          ) : (
            alerts.map((alert, i) => (
              <div
                key={alert.id || i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.level === 'critical'
                    ? 'bg-red-500/10'
                    : alert.level === 'warning'
                      ? 'bg-yellow-500/10'
                      : 'bg-blue-500/10'
                }`}
              >
                {alert.level === 'critical' ? (
                  <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                ) : alert.level === 'warning' ? (
                  <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
                ) : (
                  <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                )}
                <div className="text-sm flex-1">
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.timestamp).toLocaleTimeString()} - {alert.source}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

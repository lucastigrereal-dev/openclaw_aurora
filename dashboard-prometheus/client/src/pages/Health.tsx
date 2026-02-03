import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

const healthChecks = [
  {
    name: 'Ollama Gateway',
    status: 'healthy',
    latency: '45ms',
    uptime: '99.8%',
    lastCheck: 'Agora',
  },
  {
    name: 'Telegram Bot',
    status: 'healthy',
    latency: '120ms',
    uptime: '99.9%',
    lastCheck: '2min atrás',
  },
  {
    name: 'Kommo CRM API',
    status: 'degraded',
    latency: '850ms',
    uptime: '98.2%',
    lastCheck: '1min atrás',
  },
  {
    name: 'Notion Database',
    status: 'healthy',
    latency: '200ms',
    uptime: '99.5%',
    lastCheck: '5min atrás',
  },
  {
    name: 'Memory Cache',
    status: 'healthy',
    latency: '5ms',
    uptime: '100%',
    lastCheck: 'Agora',
  },
  {
    name: 'Disk Storage',
    status: 'healthy',
    latency: '---',
    uptime: '---',
    lastCheck: '10min atrás',
  },
];

const systemResources = [
  { name: 'CPU', usage: 35, limit: 100, unit: '%' },
  { name: 'RAM', usage: 4.2, limit: 8, unit: 'GB' },
  { name: 'Disk', usage: 120, limit: 256, unit: 'GB' },
  { name: 'GPU', usage: 0, limit: 8, unit: 'GB' },
];

export default function Health() {
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
      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">🏥 SAÚDE DO SISTEMA</h3>
            <p className="text-sm text-muted-foreground">
              {overallHealth}/{healthChecks.length} serviços saudáveis
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-green-500">{Math.round((overallHealth / healthChecks.length) * 100)}%</p>
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
        <h3 className="font-semibold mb-6">⚙️ RECURSOS DO SISTEMA</h3>
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
                  {resource.usage}/{resource.limit} {resource.unit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${(resource.usage / resource.limit) * 100}%` }}
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
        <h3 className="font-semibold mb-6">📡 SAÚDE DOS SERVIÇOS</h3>
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
                <span className="text-muted-foreground">Latência: {check.latency}</span>
                <span className="text-muted-foreground">Uptime: {check.uptime}</span>
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
        <h3 className="font-semibold mb-4">⚠️ ALERTAS ATIVOS</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg">
            <AlertCircle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-semibold">Kommo API degradada</p>
              <p className="text-xs text-muted-foreground">Latência acima de 800ms detectada</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm">
              <p className="font-semibold">Todos os serviços críticos operacionais</p>
              <p className="text-xs text-muted-foreground">Nenhum problema detectado</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

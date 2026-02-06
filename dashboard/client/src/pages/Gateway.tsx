import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { GlowingCard } from '@/components/GlowingCard';
import { CircularGauge, MultiColorGauge } from '@/components/CircularGauge';
import { AnimatedBarChart, HorizontalBarChart } from '@/components/AnimatedBarChart';
import { AnimatedLineChart } from '@/components/AnimatedLineChart';
import {
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Database,
  Cloud,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  GripVertical,
  X,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  uptime: number;
  color: string;
  icon: React.ReactNode;
}

export default function Gateway() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Ollama LLM', status: 'online', latency: 45, uptime: 99.9, color: '#22d3ee', icon: <Cpu size={20} /> },
    { name: 'PostgreSQL', status: 'online', latency: 12, uptime: 99.8, color: '#10b981', icon: <Database size={20} /> },
    { name: 'Redis Cache', status: 'online', latency: 3, uptime: 100, color: '#f59e0b', icon: <Zap size={20} /> },
    { name: 'Telegram Bot', status: 'online', latency: 89, uptime: 98.5, color: '#3b82f6', icon: <Cloud size={20} /> },
    { name: 'WhatsApp API', status: 'degraded', latency: 234, uptime: 95.2, color: '#ec4899', icon: <Wifi size={20} /> },
    { name: 'Notion Sync', status: 'online', latency: 156, uptime: 99.1, color: '#8b5cf6', icon: <Server size={20} /> },
  ]);

  const [metrics, setMetrics] = useState({
    totalRequests: 15847,
    avgLatency: 67,
    errorRate: 0.3,
    throughput: 1250,
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
        avgLatency: Math.max(20, Math.min(150, prev.avgLatency + (Math.random() - 0.5) * 20)),
        throughput: Math.max(800, Math.min(2000, prev.throughput + (Math.random() - 0.5) * 100)),
      }));

      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency: Math.max(1, Math.min(300, s.latency + (Math.random() - 0.5) * 20)),
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const latencyData = [
    { label: '00:00', value: 45 },
    { label: '04:00', value: 52 },
    { label: '08:00', value: 78 },
    { label: '12:00', value: 65 },
    { label: '16:00', value: 89 },
    { label: '20:00', value: 56 },
    { label: 'Agora', value: metrics.avgLatency },
  ];

  const requestsData = [
    { label: 'GET', value: 8500, color: '#22d3ee' },
    { label: 'POST', value: 4200, color: '#10b981' },
    { label: 'PUT', value: 1800, color: '#f59e0b' },
    { label: 'DELETE', value: 890, color: '#ef4444' },
    { label: 'WS', value: 2100, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <GlowingCard color="#22d3ee">
          <div className="flex items-center gap-3">
            <Activity size={24} className="text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-cyan-400">{metrics.totalRequests.toLocaleString()}</p>
              <p className="text-xs text-white/50">Total Requests</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#10b981">
          <div className="flex items-center gap-3">
            <Clock size={24} className="text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">{metrics.avgLatency.toFixed(0)}ms</p>
              <p className="text-xs text-white/50">Avg Latency</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#f59e0b">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-400">{metrics.throughput}/s</p>
              <p className="text-xs text-white/50">Throughput</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#ef4444">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{metrics.errorRate}%</p>
              <p className="text-xs text-white/50">Error Rate</p>
            </div>
          </div>
        </GlowingCard>
      </motion.div>

      {/* Services Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-cyan-400 mb-4">🔌 SERVIÇOS CONECTADOS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="rounded-xl border-2 p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 relative overflow-hidden group"
              style={{
                borderColor: `${service.color}40`,
                boxShadow: `0 0 20px ${service.color}20`,
              }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${service.color}15 0%, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: service.color }}>{service.icon}</span>
                    <h3 className="font-bold" style={{ color: service.color }}>
                      {service.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`w-2 h-2 rounded-full ${
                        service.status === 'online'
                          ? 'bg-green-500'
                          : service.status === 'degraded'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        service.status === 'online'
                          ? 'text-green-400'
                          : service.status === 'degraded'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      }`}
                    >
                      {service.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/40">Latência</p>
                    <p className="text-lg font-bold" style={{ color: service.color }}>
                      {service.latency.toFixed(0)}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Uptime</p>
                    <p className="text-lg font-bold text-green-400">{service.uptime}%</p>
                  </div>
                </div>
              </div>

              {/* Corner accents */}
              <div
                className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl"
                style={{ borderColor: service.color }}
              />
              <div
                className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 rounded-tr"
                style={{ borderColor: service.color }}
              />
              <div
                className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 rounded-bl"
                style={{ borderColor: service.color }}
              />
              <div
                className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 rounded-br"
                style={{ borderColor: service.color }}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <GlowingCard color="#22d3ee">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">📈 LATÊNCIA (24H)</h3>
          <AnimatedLineChart
            data={latencyData}
            color="#22d3ee"
            secondaryColor="#10b981"
            height={150}
          />
        </GlowingCard>

        <GlowingCard color="#8b5cf6">
          <h3 className="text-lg font-bold text-purple-400 mb-4">📊 REQUESTS POR TIPO</h3>
          <AnimatedBarChart data={requestsData} height={150} />
        </GlowingCard>
      </motion.div>

      {/* Performance Gauges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlowingCard color="#10b981">
          <h3 className="text-lg font-bold text-green-400 mb-6 text-center">⚡ PERFORMANCE DO GATEWAY</h3>
          <div className="flex justify-around items-center flex-wrap gap-6">
            <CircularGauge value={94.5} label="Success Rate" color="#10b981" size={120} />
            <CircularGauge value={67} label="CPU Usage" color="#22d3ee" size={120} />
            <CircularGauge value={45} label="Memory" color="#f59e0b" size={120} />
            <CircularGauge value={23} label="Connections" color="#8b5cf6" size={120} showPercentage={false} />
          </div>
        </GlowingCard>
      </motion.div>
    </div>
  );
}

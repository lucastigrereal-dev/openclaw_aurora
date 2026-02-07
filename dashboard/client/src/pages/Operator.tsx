/**
 * Operator Page - Página principal para interagir com o OpenClaw
 *
 * - Enviar intents
 * - Visualizar e executar workflows dos hubs
 * - Ver execuções recentes
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlowingCard } from '@/components/GlowingCard';
import { IntentPanel } from '@/components/IntentPanel';
import { HubsPanel } from '@/components/HubsPanel';
import { useOpenClawAPI, Execution, HealthData } from '@/hooks/useOpenClawAPI';
import {
  Brain,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function Operator() {
  const { getHealth, getExecutions, loading } = useOpenClawAPI();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh every 30s
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setRefreshing(true);
    const [healthRes, execRes] = await Promise.all([getHealth(), getExecutions()]);
    if (healthRes.success && healthRes.data) {
      setHealth(healthRes.data);
    }
    if (execRes.success && execRes.data) {
      setExecutions(execRes.data.executions);
    }
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
      case 'blocked':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Operator</h1>
            <p className="text-sm text-gray-400">Centro de comando do OpenClaw</p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </motion.div>

      {/* Status Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <GlowingCard color={health?.status === 'healthy' ? '#10b981' : '#ef4444'}>
          <div className="flex items-center gap-3">
            {health?.status === 'healthy' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
            <div>
              <p className={`text-xl font-bold ${health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
                {health?.status?.toUpperCase() || 'OFFLINE'}
              </p>
              <p className="text-xs text-white/50">Status do Sistema</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#22d3ee">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-xl font-bold text-cyan-400">{health?.hubs_available || 0}</p>
              <p className="text-xs text-white/50">Hubs Ativos</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#8b5cf6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-xl font-bold text-purple-400">{health?.total_skills || 0}</p>
              <p className="text-xs text-white/50">Skills Disponíveis</p>
            </div>
          </div>
        </GlowingCard>

        <GlowingCard color="#f59e0b">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-400" />
            <div>
              <p className="text-xl font-bold text-amber-400">
                {health ? Math.floor((health.uptime_ms || 0) / 60000) : 0}m
              </p>
              <p className="text-xs text-white/50">Uptime</p>
            </div>
          </div>
        </GlowingCard>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Intent Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <IntentPanel />
        </motion.div>

        {/* Right: Hubs Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <HubsPanel />
        </motion.div>
      </div>

      {/* Recent Executions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlowingCard color="#6366f1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Execuções Recentes
          </h3>

          {executions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {loading ? (
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-400" />
              ) : (
                'Nenhuma execução recente'
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {executions.slice(0, 10).map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(exec.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {exec.type === 'workflow' ? exec.workflow : 'Intent'}
                        </span>
                        {exec.hub && (
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                            {exec.hub}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-gray-500">{exec.id}</code>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        exec.status === 'completed'
                          ? 'text-green-400'
                          : exec.status === 'failed' || exec.status === 'blocked'
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {exec.status}
                    </span>
                    <div className="text-xs text-gray-500">{formatDate(exec.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowingCard>
      </motion.div>
    </div>
  );
}

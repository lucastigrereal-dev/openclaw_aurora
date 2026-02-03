import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Plug,
  MessageSquare,
  TrendingUp,
  Activity,
  AlertTriangle,
  Info,
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'execution' | 'connection' | 'metric';
  title: string;
  description: string;
  timestamp: number;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  maxItems?: number;
  autoScroll?: boolean;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'execution',
    title: 'browser.open executado',
    description: 'Abriu https://example.com com sucesso em 2.1s',
    timestamp: Date.now() - 5000,
  },
  {
    id: '2',
    type: 'connection',
    title: 'Kommo CRM conectado',
    description: 'API sincronizada com 1,247 contatos',
    timestamp: Date.now() - 15000,
  },
  {
    id: '3',
    type: 'success',
    title: 'Notion database atualizada',
    description: '12 páginas sincronizadas com sucesso',
    timestamp: Date.now() - 25000,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Kommo API latência alta',
    description: 'Latência detectada: 850ms (normal: 200ms)',
    timestamp: Date.now() - 45000,
  },
  {
    id: '5',
    type: 'execution',
    title: 'file.glob executado',
    description: 'Encontrou 347 arquivos em /home/user/docs',
    timestamp: Date.now() - 65000,
  },
  {
    id: '6',
    type: 'info',
    title: 'Briefing matinal enviado',
    description: 'Telegram: 5 mensagens enviadas com sucesso',
    timestamp: Date.now() - 120000,
  },
];

export function ActivityFeed({ maxItems = 8, autoScroll = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(mockActivities);

  useEffect(() => {
    // Simular novas atividades chegando
    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: ['success', 'error', 'warning', 'info', 'execution', 'connection'][
          Math.floor(Math.random() * 6)
        ] as ActivityItem['type'],
        title: [
          'Skill executada com sucesso',
          'Conexão estabelecida',
          'Alerta de sistema',
          'Métrica atualizada',
          'Erro detectado',
          'Sincronização completa',
        ][Math.floor(Math.random() * 6)],
        description: [
          'Operação concluída em tempo recorde',
          'API respondendo normalmente',
          'Verificar logs para detalhes',
          'Valores dentro do esperado',
          'Tentando reconectar...',
          'Todos os dados sincronizados',
        ][Math.floor(Math.random() * 6)],
        timestamp: Date.now(),
      };

      setActivities((prev) => [newActivity, ...prev.slice(0, maxItems - 1)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [maxItems]);

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertTriangle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertCircle size={18} className="text-yellow-500" />;
      case 'execution':
        return <Zap size={18} className="text-accent" />;
      case 'connection':
        return <Plug size={18} className="text-blue-500" />;
      case 'metric':
        return <TrendingUp size={18} className="text-purple-500" />;
      default:
        return <Info size={18} className="text-cyan-500" />;
    }
  };

  const getBackgroundColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'execution':
        return 'bg-accent/10 border-accent/30';
      case 'connection':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'metric':
        return 'bg-purple-500/10 border-purple-500/30';
      default:
        return 'bg-cyan-500/10 border-cyan-500/30';
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s atrás`;
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          ATIVIDADES EM TEMPO REAL
        </h3>
        <span className="text-xs text-muted-foreground">{activities.length} eventos</span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 p-3 rounded-lg border ${getBackgroundColor(
                activity.type
              )} hover:bg-opacity-20 transition-all cursor-pointer group`}
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="relative">
                  {getIcon(activity.type)}
                  {index === 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border border-current opacity-50"
                    />
                  )}
                </div>
                {index < activities.length - 1 && (
                  <div className="w-0.5 h-6 bg-gradient-to-b from-current/50 to-transparent" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>

                {/* Metadata */}
                {activity.metadata && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-foreground/50">{key}:</span>
                        <span className="text-accent">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pulse indicator for new items */}
              {index === 0 && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 200, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 200, 255, 0.6);
        }
      `}</style>
    </div>
  );
}

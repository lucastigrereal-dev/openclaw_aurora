import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowingCard } from '@/components/GlowingCard';
import {
  Terminal,
  Filter,
  Download,
  Trash2,
  Pause,
  Play,
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  source: string;
  message: string;
}

const levelConfig = {
  info: { color: '#22d3ee', icon: Info, label: 'INFO' },
  warn: { color: '#f59e0b', icon: AlertTriangle, label: 'WARN' },
  error: { color: '#ef4444', icon: XCircle, label: 'ERROR' },
  success: { color: '#10b981', icon: CheckCircle, label: 'SUCCESS' },
  debug: { color: '#8b5cf6', icon: Terminal, label: 'DEBUG' },
};

const generateLog = (): LogEntry => {
  const levels: Array<'info' | 'warn' | 'error' | 'success' | 'debug'> = ['info', 'warn', 'error', 'success', 'debug'];
  const sources = ['SYSTEM', 'API', 'SKILL', 'WEBSOCKET', 'DATABASE', 'CACHE'];
  const messages = [
    'Conexão estabelecida com sucesso',
    'Processando requisição...',
    'Skill executada em 45ms',
    'Cache atualizado',
    'Timeout na conexão com API externa',
    'Backup automático iniciado',
    'Novo evento recebido via WebSocket',
    'Query executada em 12ms',
    'Autenticação validada',
    'Rate limit atingido, aguardando...',
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
  };
};

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Generate initial logs
  useEffect(() => {
    const initialLogs = Array.from({ length: 20 }, () => generateLog());
    setLogs(initialLogs);
  }, []);

  // Auto-generate new logs
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setLogs((prev) => [...prev.slice(-100), generateLog()]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const logCounts = {
    info: logs.filter((l) => l.level === 'info').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length,
    success: logs.filter((l) => l.level === 'success').length,
    debug: logs.filter((l) => l.level === 'debug').length,
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-5 gap-4"
      >
        {Object.entries(levelConfig).map(([level, config]) => (
          <GlowingCard key={level} color={config.color} glowIntensity={0.3}>
            <div className="flex items-center gap-2">
              <config.icon size={18} style={{ color: config.color }} />
              <div>
                <p className="text-xl font-bold" style={{ color: config.color }}>
                  {logCounts[level as keyof typeof logCounts]}
                </p>
                <p className="text-xs text-white/50">{config.label}</p>
              </div>
            </div>
          </GlowingCard>
        ))}
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 font-mono text-sm"
          />
        </div>

        {/* Level filters */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              filter === 'all' ? 'bg-cyan-500/30 text-cyan-400' : 'bg-white/5 text-white/60'
            }`}
          >
            TODOS
          </motion.button>
          {Object.entries(levelConfig).map(([level, config]) => (
            <motion.button
              key={level}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                filter === level ? '' : 'bg-white/5 text-white/60'
              }`}
              style={{
                background: filter === level ? `${config.color}30` : undefined,
                color: filter === level ? config.color : undefined,
              }}
            >
              {config.label}
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPaused(!isPaused)}
            className={`p-3 rounded-xl ${isPaused ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10"
          >
            <Download size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLogs([])}
            className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            <Trash2 size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 min-h-96"
      >
        <div
          className="h-full rounded-xl border-2 border-cyan-500/30 bg-slate-900/90 overflow-hidden"
          style={{ boxShadow: '0 0 30px rgba(34,211,238,0.1)' }}
        >
          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-cyan-500/20">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-cyan-400" />
              <span className="text-sm font-mono text-cyan-400">KRONOS TERMINAL</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: isPaused ? 0.5 : [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: isPaused ? 0 : Infinity }}
                className="w-2 h-2 rounded-full bg-green-500"
              />
              <span className="text-xs text-white/50">
                {isPaused ? 'PAUSED' : 'LIVE'}
              </span>
            </div>
          </div>

          {/* Logs container */}
          <div className="h-[400px] overflow-auto p-4 font-mono text-sm custom-scrollbar">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => {
                const config = levelConfig[log.level];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 py-2 border-b border-white/5 hover:bg-white/5 rounded px-2 group"
                  >
                    <span className="text-white/30 text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                    <div
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                      style={{
                        background: `${config.color}20`,
                        color: config.color,
                      }}
                    >
                      <Icon size={12} />
                      {config.label}
                    </div>
                    <span className="text-purple-400 text-xs whitespace-nowrap">[{log.source}]</span>
                    <span className="text-white/80 flex-1">{log.message}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

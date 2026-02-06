import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowingCard } from '@/components/GlowingCard';
import {
  Plug,
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  Globe,
  Database,
  MessageSquare,
  Calendar,
  Mail,
  FileText,
  Zap,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react';

interface ConnectorConfig {
  id: string;
  service: string;
  icon: string;
  status: 'online' | 'offline' | 'error';
  lastSync?: string;
  credential?: string;
  apiKey?: string;
  color: string;
  syncCount: number;
  errorCount: number;
}

const connectorTypes = [
  { id: 'kommo', name: 'Kommo CRM', color: '#3b82f6', icon: '📊' },
  { id: 'notion', name: 'Notion', color: '#8b5cf6', icon: '📝' },
  { id: 'telegram', name: 'Telegram', color: '#22d3ee', icon: '📱' },
  { id: 'whatsapp', name: 'WhatsApp', color: '#10b981', icon: '💬' },
  { id: 'calendar', name: 'Google Calendar', color: '#f59e0b', icon: '📅' },
  { id: 'email', name: 'Email SMTP', color: '#ec4899', icon: '📧' },
];

const initialConnectors: ConnectorConfig[] = [
  { id: '1', service: 'Telegram', icon: '📱', status: 'online', lastSync: 'Agora', credential: '***bot_tok', color: '#22d3ee', syncCount: 2341, errorCount: 12 },
  { id: '2', service: 'Kommo CRM', icon: '📊', status: 'offline', credential: 'Não config', color: '#3b82f6', syncCount: 0, errorCount: 0 },
  { id: '3', service: 'Notion', icon: '📝', status: 'online', lastSync: '5min atrás', credential: '***xyz123', color: '#8b5cf6', syncCount: 856, errorCount: 0 },
  { id: '4', service: 'Google Drive', icon: '📁', status: 'offline', credential: 'Não config', color: '#f59e0b', syncCount: 0, errorCount: 0 },
  { id: '5', service: 'Gmail', icon: '📧', status: 'offline', credential: 'Não config', color: '#ec4899', syncCount: 0, errorCount: 0 },
  { id: '6', service: 'Google Calendar', icon: '📅', status: 'offline', credential: 'Não config', color: '#f59e0b', syncCount: 0, errorCount: 0 },
  { id: '7', service: 'Obsidian', icon: '🗂️', status: 'online', lastSync: 'Local', credential: '~/clawd', color: '#10b981', syncCount: 432, errorCount: 3 },
];

export default function Connectors() {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>(initialConnectors);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<{ apiKey: string; showApiKey: boolean }>({ apiKey: '', showApiKey: false });

  const connectedCount = connectors.filter((c) => c.status === 'online').length;
  const totalSyncs = connectors.reduce((sum, c) => sum + c.syncCount, 0);
  const totalErrors = connectors.reduce((sum, c) => sum + c.errorCount, 0);

  const handleConfigureConnector = (connector: ConnectorConfig) => {
    setSelectedConnector(connector);
    setFormData({ apiKey: connector.apiKey || '', showApiKey: false });
    setShowModal(true);
  };

  const handleSaveConfig = () => {
    if (selectedConnector && formData.apiKey) {
      setConnectors(
        connectors.map((c) =>
          c.id === selectedConnector.id
            ? {
                ...c,
                status: 'online' as const,
                apiKey: formData.apiKey,
                credential: `***${formData.apiKey?.slice(-6)}`,
                lastSync: 'Agora',
              }
            : c
        )
      );
      setShowModal(false);
      setSelectedConnector(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <GlowingCard color="#22d3ee">
          <div className="flex items-center gap-3">
            <Plug size={24} className="text-cyan-400" />
            <div>
              <p className="text-2xl font-bold text-cyan-400">{connectors.length}</p>
              <p className="text-xs text-white/50">Conectores</p>
            </div>
          </div>
        </GlowingCard>
        <GlowingCard color="#10b981">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">{connectedCount}</p>
              <p className="text-xs text-white/50">Conectados</p>
            </div>
          </div>
        </GlowingCard>
        <GlowingCard color="#f59e0b">
          <div className="flex items-center gap-3">
            <RefreshCw size={24} className="text-amber-400" />
            <div>
              <p className="text-2xl font-bold text-amber-400">{totalSyncs.toLocaleString()}</p>
              <p className="text-xs text-white/50">Sincronizações</p>
            </div>
          </div>
        </GlowingCard>
        <GlowingCard color="#ef4444">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{totalErrors}</p>
              <p className="text-xs text-white/50">Erros</p>
            </div>
          </div>
        </GlowingCard>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-between items-center"
      >
        <h2 className="text-xl font-bold text-cyan-400">🔌 CONECTORES</h2>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 font-semibold flex items-center gap-2"
        >
          <RefreshCw size={18} />
          Reconectar Todos
        </motion.button>
      </motion.div>

      {/* Connectors Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {connectors.map((connector, index) => (
          <motion.div
            key={connector.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="rounded-xl border-2 p-5 bg-gradient-to-br from-slate-900/90 to-slate-800/90 relative overflow-hidden group cursor-pointer"
            style={{
              borderColor: `${connector.color}40`,
              boxShadow: `0 0 20px ${connector.color}20`,
            }}
            onClick={() => handleConfigureConnector(connector)}
          >
            {/* Animated background */}
            <motion.div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${connector.color}15 0%, transparent 70%)`,
              }}
            />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{connector.icon}</span>
                  <div>
                    <h3 className="font-bold" style={{ color: connector.color }}>
                      {connector.service}
                    </h3>
                    <p className="text-xs text-white/50">
                      {connector.lastSync ? `Sync: ${connector.lastSync}` : 'Não configurado'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={connector.status === 'online' ? {
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`w-3 h-3 rounded-full ${
                      connector.status === 'online' ? 'bg-green-500' : connector.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                    }`}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/40">Syncs</p>
                  <p className="text-lg font-bold" style={{ color: connector.color }}>
                    {connector.syncCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-xs text-white/40">Erros</p>
                  <p className={`text-lg font-bold ${connector.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {connector.errorCount}
                  </p>
                </div>
              </div>

              {/* Credential */}
              <div className="p-2 rounded-lg bg-black/30 border border-white/10">
                <div className="flex items-center gap-2">
                  <Key size={12} className="text-white/40" />
                  <span className="font-mono text-xs text-white/60">{connector.credential}</span>
                </div>
              </div>
            </div>

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl" style={{ borderColor: connector.color }} />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 rounded-tr" style={{ borderColor: connector.color }} />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 rounded-bl" style={{ borderColor: connector.color }} />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 rounded-br" style={{ borderColor: connector.color }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showModal && selectedConnector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl border-2 p-8 bg-gradient-to-br from-slate-900 to-slate-800"
              style={{
                borderColor: `${selectedConnector.color}50`,
                boxShadow: `0 0 40px ${selectedConnector.color}30`,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedConnector.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: selectedConnector.color }}>
                      {selectedConnector.service}
                    </h2>
                    <p className="text-white/60 text-sm">Configurar integração</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X size={24} className="text-white/60" />
                </motion.button>
              </div>

              {/* API Key Input */}
              <div className="mb-6">
                <label className="text-sm text-white/60 mb-2 block">API Key / Token</label>
                <div className="flex gap-2">
                  <input
                    type={formData.showApiKey ? 'text' : 'password'}
                    placeholder={`Sua API Key do ${selectedConnector.service}`}
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setFormData({ ...formData, showApiKey: !formData.showApiKey })}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10"
                  >
                    {formData.showApiKey ? <EyeOff size={18} className="text-white/60" /> : <Eye size={18} className="text-white/60" />}
                  </motion.button>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm font-semibold text-white/80 mb-2">Como obter sua API Key:</p>
                <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside">
                  {selectedConnector.service === 'Kommo CRM' && (
                    <>
                      <li>Acesse kommo.com</li>
                      <li>Vá para Configurações → Integrações</li>
                      <li>Clique em "Criar API Key"</li>
                      <li>Copie e cole aqui</li>
                    </>
                  )}
                  {selectedConnector.service === 'Notion' && (
                    <>
                      <li>Acesse notion.so/my-integrations</li>
                      <li>Clique em "Criar nova integração"</li>
                      <li>Nomeie sua integração</li>
                      <li>Copie o "Internal Integration Token"</li>
                    </>
                  )}
                  {!['Kommo CRM', 'Notion'].includes(selectedConnector.service) && (
                    <>
                      <li>Acesse as configurações do serviço</li>
                      <li>Procure por API ou Integrações</li>
                      <li>Gere uma nova chave de API</li>
                      <li>Cole aqui para conectar</li>
                    </>
                  )}
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveConfig}
                  disabled={!formData.apiKey}
                  className="flex-1 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(135deg, ${selectedConnector.color}40 0%, ${selectedConnector.color}20 100%)`,
                    color: selectedConnector.color,
                  }}
                >
                  Salvar e Conectar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold"
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

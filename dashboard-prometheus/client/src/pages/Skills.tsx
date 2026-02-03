import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlowingCard } from '@/components/GlowingCard';
import { CircularGauge } from '@/components/CircularGauge';
import {
  Zap,
  Search,
  Filter,
  Play,
  Pause,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Database,
  Mail,
  Globe,
  FileText,
  Bot,
  Webhook,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string;
  status: 'active' | 'inactive' | 'error';
  executions: number;
  successRate: number;
  avgTime: number;
  color: string;
  icon: React.ReactNode;
  risk: 'high' | 'medium' | 'low';
  desc: string;
}

const categories = [
  { id: 'all', label: 'Todas', color: '#22d3ee' },
  { id: 'exec', label: 'EXEC', color: '#ef4444' },
  { id: 'browser', label: 'BROWSER', color: '#3b82f6' },
  { id: 'file', label: 'FILE', color: '#10b981' },
  { id: 'vision', label: 'VISION', color: '#f59e0b' },
  { id: 'memory', label: 'MEMORY', color: '#8b5cf6' },
  { id: 'web', label: 'WEB', color: '#ec4899' },
];

const skillsData: Skill[] = [
  { id: '1', name: 'exec.bash', category: 'exec', status: 'active', executions: 1247, successRate: 98.5, avgTime: 120, color: '#ef4444', icon: <Zap size={24} />, risk: 'high', desc: 'Executa comandos bash no sistema' },
  { id: '2', name: 'exec.python', category: 'exec', status: 'active', executions: 856, successRate: 96.2, avgTime: 200, color: '#ef4444', icon: <Bot size={24} />, risk: 'high', desc: 'Executa scripts Python no ambiente' },
  { id: '3', name: 'browser.open', category: 'browser', status: 'active', executions: 432, successRate: 99.8, avgTime: 450, color: '#3b82f6', icon: <Globe size={24} />, risk: 'medium', desc: 'Abre URL no Chrome controlado' },
  { id: '4', name: 'browser.screenshot', category: 'browser', status: 'active', executions: 678, successRate: 97.3, avgTime: 80, color: '#3b82f6', icon: <FileText size={24} />, risk: 'low', desc: 'Captura tela do navegador' },
  { id: '5', name: 'file.read', category: 'file', status: 'active', executions: 234, successRate: 94.1, avgTime: 150, color: '#10b981', icon: <FileText size={24} />, risk: 'low', desc: 'Lê arquivos do sistema' },
  { id: '6', name: 'file.write', category: 'file', status: 'active', executions: 567, successRate: 92.5, avgTime: 800, color: '#10b981', icon: <Database size={24} />, risk: 'medium', desc: 'Escreve arquivos no sistema' },
  { id: '7', name: 'vision.ocr', category: 'vision', status: 'active', executions: 156, successRate: 100, avgTime: 1200, color: '#f59e0b', icon: <Search size={24} />, risk: 'low', desc: 'Extrai texto de imagens' },
  { id: '8', name: 'memory.store', category: 'memory', status: 'error', executions: 89, successRate: 78.5, avgTime: 50, color: '#8b5cf6', icon: <Database size={24} />, risk: 'low', desc: 'Armazena dados na memória' },
  { id: '9', name: 'web.scrape', category: 'web', status: 'active', executions: 345, successRate: 91.2, avgTime: 600, color: '#ec4899', icon: <Globe size={24} />, risk: 'medium', desc: 'Extrai dados de páginas web' },
  { id: '10', name: 'telegram.send', category: 'web', status: 'active', executions: 789, successRate: 99.1, avgTime: 100, color: '#22d3ee', icon: <MessageSquare size={24} />, risk: 'low', desc: 'Envia mensagens via Telegram' },
];

export default function Skills() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const filteredSkills = skillsData.filter((skill) => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalExecutions = skillsData.reduce((sum, s) => sum + s.executions, 0);
  const avgSuccessRate = skillsData.reduce((sum, s) => sum + s.successRate, 0) / skillsData.length;
  const activeSkills = skillsData.filter((s) => s.status === 'active').length;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
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
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">{skillsData.length}</p>
            <p className="text-xs text-white/50">Total Skills</p>
          </div>
        </GlowingCard>
        <GlowingCard color="#10b981">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-400">{activeSkills}</p>
            <p className="text-xs text-white/50">Ativas</p>
          </div>
        </GlowingCard>
        <GlowingCard color="#f59e0b">
          <div className="text-center">
            <p className="text-3xl font-bold text-amber-400">{totalExecutions.toLocaleString()}</p>
            <p className="text-xs text-white/50">Execuções</p>
          </div>
        </GlowingCard>
        <GlowingCard color="#8b5cf6">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">{avgSuccessRate.toFixed(1)}%</p>
            <p className="text-xs text-white/50">Taxa Sucesso</p>
          </div>
        </GlowingCard>
      </motion.div>

      {/* Filters */}
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
            placeholder="Buscar skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-cyan-500/30 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                selectedCategory === cat.id ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
              style={{
                background: selectedCategory === cat.id
                  ? `linear-gradient(135deg, ${cat.color}40 0%, ${cat.color}20 100%)`
                  : 'rgba(255,255,255,0.05)',
                borderColor: selectedCategory === cat.id ? cat.color : 'transparent',
                border: '1px solid',
              }}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Skills Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredSkills.map((skill, index) => (
            <motion.div
              key={skill.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => setSelectedSkill(skill)}
              className="cursor-pointer rounded-xl border-2 p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/90 relative overflow-hidden group"
              style={{
                borderColor: `${skill.color}40`,
                boxShadow: `0 0 20px ${skill.color}20`,
              }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${skill.color}20 0%, transparent 70%)`,
                }}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ color: skill.color }}>{skill.icon}</span>
                    <h3 className="font-bold text-sm" style={{ color: skill.color }}>
                      {skill.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} style={{ color: getRiskColor(skill.risk) }} />
                    <div
                      className={`w-2 h-2 rounded-full ${
                        skill.status === 'active' ? 'bg-green-500' : skill.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-white/60 mb-3 line-clamp-2">{skill.desc}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-white/40">Execuções</p>
                    <p className="font-bold text-white">{skill.executions}</p>
                  </div>
                  <div>
                    <p className="text-white/40">Sucesso</p>
                    <p className="font-bold text-green-400">{skill.successRate}%</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-1"
                  >
                    <Play size={14} className="text-green-400" />
                    <span className="text-xs text-white/70">Executar</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                  >
                    <Info size={14} className="text-white/60" />
                  </motion.button>
                </div>
              </div>

              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 rounded-tl" style={{ borderColor: skill.color }} />
              <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 rounded-tr" style={{ borderColor: skill.color }} />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 rounded-bl" style={{ borderColor: skill.color }} />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 rounded-br" style={{ borderColor: skill.color }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Skill Detail Modal */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setSelectedSkill(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border-2 p-8 bg-gradient-to-br from-slate-900 to-slate-800"
              style={{
                borderColor: `${selectedSkill.color}50`,
                boxShadow: `0 0 40px ${selectedSkill.color}30`,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl" style={{ background: `${selectedSkill.color}20` }}>
                    {selectedSkill.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: selectedSkill.color }}>
                      {selectedSkill.name}
                    </h2>
                    <p className="text-white/60">{selectedSkill.category.toUpperCase()}</p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedSkill(null)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <X size={24} className="text-white/60" />
                </motion.button>
              </div>

              <p className="text-white/70 mb-6">{selectedSkill.desc}</p>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <CircularGauge
                  value={selectedSkill.successRate}
                  label="Taxa Sucesso"
                  color={selectedSkill.color}
                  size={100}
                />
                <div className="text-center flex flex-col justify-center">
                  <p className="text-4xl font-bold" style={{ color: selectedSkill.color }}>
                    {selectedSkill.executions}
                  </p>
                  <p className="text-sm text-white/50">Execuções</p>
                </div>
                <div className="text-center flex flex-col justify-center">
                  <p className="text-4xl font-bold text-amber-400">{selectedSkill.avgTime}ms</p>
                  <p className="text-sm text-white/50">Tempo Médio</p>
                </div>
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${selectedSkill.color}40 0%, ${selectedSkill.color}20 100%)`,
                    color: selectedSkill.color,
                  }}
                >
                  <Play size={18} />
                  Executar Agora
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-semibold flex items-center justify-center gap-2 text-white/70"
                >
                  <Settings size={18} />
                  Configurar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

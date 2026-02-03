import { motion } from 'framer-motion';
import { Plus, FileText, Play, Pause, Trash2 } from 'lucide-react';

const flows = [
  {
    name: 'Follow-up Pós-Procedimento',
    trigger: 'Novo agendamento concluído',
    steps: 4,
    status: 'active',
    lastExec: '2h atrás',
    success: 98,
  },
  {
    name: 'Briefing Matinal',
    trigger: 'Cron 07:00 diário',
    steps: 6,
    status: 'active',
    lastExec: '5h atrás',
    success: 100,
  },
  {
    name: 'Anti-No-Show',
    trigger: '24h antes do agendamento',
    steps: 3,
    status: 'paused',
    lastExec: '3d atrás',
    success: 87,
  },
];

export default function Flows() {
  return (
    <div className="space-y-8">
      {/* Header actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4"
      >
        <button className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors">
          <Plus size={20} />
          Novo Fluxo
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
          <FileText size={20} />
          Templates
        </button>
      </motion.div>

      {/* Flows list */}
      <div className="space-y-4">
        {flows.map((flow, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-lg p-6 neon-border"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="font-semibold">📋 {flow.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">Trigger: {flow.trigger}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${flow.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-xs font-semibold uppercase">
                  {flow.status === 'active' ? '● ATIVO' : '⏸️ PAUSED'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">Steps:</span> {flow.steps}
              </div>
              <div>
                <span className="text-muted-foreground">Última exec:</span> {flow.lastExec}
              </div>
              <div>
                <span className="text-muted-foreground">Success:</span> {flow.success}%
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-accent/20 hover:bg-accent/30 rounded-lg transition-colors text-sm">
                <Play size={16} />
                Executar
              </button>
              <button className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm">
                Editar
              </button>
              <button className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm">
                {flow.status === 'active' ? 'Pausar' : 'Ativar'}
              </button>
              <button className="px-3 py-2 bg-destructive/20 hover:bg-destructive/30 rounded-lg transition-colors text-sm">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-lg p-6 neon-border"
      >
        <h3 className="font-semibold mb-4">📁 TEMPLATES PRONTOS</h3>
        <div className="flex gap-2 flex-wrap">
          {['Lead Qualification', 'Post-Op Follow', 'Daily Report', 'Inbox Zero'].map((template, i) => (
            <button
              key={i}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm"
            >
              {template}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

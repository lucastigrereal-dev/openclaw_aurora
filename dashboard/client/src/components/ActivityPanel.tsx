import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, Bell, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { ActivityFeed, ActivityItem } from './ActivityFeed';

interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityPanel({ isOpen, onClose }: ActivityPanelProps) {
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings' | 'success'>('all');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Bell size={24} className="text-accent" />
                <h2 className="text-xl font-semibold">ATIVIDADES</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-4 border-b border-border">
              {[
                { id: 'all', label: 'Todas', icon: null },
                { id: 'errors', label: 'Erros', icon: AlertCircle },
                { id: 'warnings', label: 'Avisos', icon: AlertCircle },
                { id: 'success', label: 'Sucesso', icon: CheckCircle },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                    filter === f.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {f.icon && <f.icon size={14} />}
                  {f.label}
                </button>
              ))}
            </div>

            {/* Feed */}
            <div className="flex-1 overflow-y-auto p-4">
              <ActivityFeed maxItems={20} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-2">
              <button className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm">
                Limpar Tudo
              </button>
              <button className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors text-sm">
                Exportar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';

interface PanelConfig {
  id: string;
  title: string;
  color: string;
  content: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

interface DraggableGridProps {
  panels: PanelConfig[];
  onPanelsChange?: (panels: PanelConfig[]) => void;
  onRemovePanel?: (id: string) => void;
}

export function DraggableGrid({ panels, onPanelsChange, onRemovePanel }: DraggableGridProps) {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const handleReorder = useCallback(
    (newOrder: PanelConfig[]) => {
      onPanelsChange?.(newOrder);
    },
    [onPanelsChange]
  );

  const getSizeClasses = (size: string = 'medium') => {
    switch (size) {
      case 'small':
        return 'col-span-1';
      case 'large':
        return 'col-span-2 row-span-2';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className="relative">
      {/* Expanded panel overlay */}
      <AnimatePresence>
        {expandedPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setExpandedPanel(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[80vh] overflow-auto"
            >
              {panels.find((p) => p.id === expandedPanel)?.content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <Reorder.Group
        axis="y"
        values={panels}
        onReorder={handleReorder}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {panels.map((panel) => (
          <Reorder.Item
            key={panel.id}
            value={panel}
            className={getSizeClasses(panel.size)}
          >
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ y: -4 }}
              className="h-full"
            >
              <div
                className="h-full rounded-xl border-2 p-5 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md overflow-hidden relative group"
                style={{
                  borderColor: `${panel.color}50`,
                  boxShadow: `0 0 20px ${panel.color}30`,
                }}
              >
                {/* Animated background */}
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  animate={{
                    background: [
                      `radial-gradient(circle at 0% 0%, ${panel.color}20 0%, transparent 50%)`,
                      `radial-gradient(circle at 100% 100%, ${panel.color}20 0%, transparent 50%)`,
                      `radial-gradient(circle at 0% 0%, ${panel.color}20 0%, transparent 50%)`,
                    ],
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                />

                {/* Header */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="cursor-grab active:cursor-grabbing p-1"
                    >
                      <GripVertical size={16} style={{ color: panel.color }} className="opacity-60" />
                    </motion.div>
                    <h3 className="font-bold text-sm" style={{ color: panel.color }}>
                      {panel.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setExpandedPanel(panel.id)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Maximize2 size={14} className="text-white/60" />
                    </motion.button>
                    {onRemovePanel && (
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRemovePanel(panel.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <X size={14} className="text-red-400" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10">{panel.content}</div>

                {/* Corner accents */}
                <div
                  className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg"
                  style={{ borderColor: panel.color }}
                />
                <div
                  className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg"
                  style={{ borderColor: panel.color }}
                />
                <div
                  className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg"
                  style={{ borderColor: panel.color }}
                />
                <div
                  className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg"
                  style={{ borderColor: panel.color }}
                />
              </div>
            </motion.div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}

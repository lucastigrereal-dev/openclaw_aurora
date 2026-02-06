import { motion } from 'framer-motion';
import { SkillMetrics } from '@/services/metricsAggregator';
import { Zap, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

interface TopSkillsPanelProps {
  skills: SkillMetrics[];
  delay?: number;
}

export function TopSkillsPanel({ skills, delay = 0 }: TopSkillsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-lg p-6 neon-border"
    >
      <h3 className="font-semibold mb-6 text-lg flex items-center gap-2">
        <Zap size={20} className="text-accent" />
        TOP SKILLS
      </h3>

      <div className="space-y-3">
        {skills.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhuma skill executada</div>
        ) : (
          skills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + index * 0.05 }}
              className="p-4 bg-secondary/30 rounded-lg border border-border/50 hover:border-accent/50 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                    {index + 1}. {skill.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {skill.executions} execuções
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-accent">{skill.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">sucesso</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-black/20 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Tempo Médio</p>
                  <p className="text-sm font-semibold text-foreground">{skill.avgDuration.toFixed(0)}ms</p>
                </div>
                <div className="bg-black/20 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Sucesso</p>
                  <p className="text-sm font-semibold text-green-500">{skill.successes}</p>
                </div>
                <div className="bg-black/20 rounded p-2 text-center">
                  <p className="text-xs text-muted-foreground">Falhas</p>
                  <p className="text-sm font-semibold text-red-500">{skill.failures}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.successRate}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full ${
                    skill.successRate >= 90
                      ? 'bg-green-500'
                      : skill.successRate >= 70
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mt-3 text-xs">
                {skill.successRate >= 90 ? (
                  <>
                    <CheckCircle size={14} className="text-green-500" />
                    <span className="text-green-500">Operacional</span>
                  </>
                ) : skill.successRate >= 70 ? (
                  <>
                    <AlertCircle size={14} className="text-yellow-500" />
                    <span className="text-yellow-500">Atenção</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-red-500">Crítico</span>
                  </>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

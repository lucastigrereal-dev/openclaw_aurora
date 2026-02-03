import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: number;
  icon?: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
  delay?: number;
}

export function MetricsCard({
  title,
  value,
  unit,
  trend,
  icon,
  status = 'good',
  delay = 0,
}: MetricsCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'border-green-500/30 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'critical':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-accent/30 bg-accent/10';
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-muted-foreground';
    return trend > 0 ? 'text-red-500' : 'text-green-500';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`glass rounded-lg p-6 neon-border border ${getStatusColor()} relative overflow-hidden`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
          {status === 'critical' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertCircle size={18} className="text-red-500" />
            </motion.div>
          )}
          {icon && <div className="text-accent">{icon}</div>}
        </div>

        {/* Value */}
        <div className="mb-4">
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-foreground"
          >
            {value}
            {unit && <span className="text-lg text-muted-foreground ml-2">{unit}</span>}
          </motion.div>
        </div>

        {/* Trend */}
        {trend !== undefined && (
          <div className={`flex items-center gap-2 text-sm ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="font-semibold">
              {Math.abs(trend).toFixed(1)}% {trend > 0 ? 'acima' : 'abaixo'} do normal
            </span>
          </div>
        )}
      </div>

      {/* Animated border */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 rounded-lg border border-accent/20 pointer-events-none"
      />
    </motion.div>
  );
}

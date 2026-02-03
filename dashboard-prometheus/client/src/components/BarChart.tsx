import { motion } from 'framer-motion';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface AnimatedBarChartProps {
  data: BarData[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
}

export function AnimatedBarChart({
  data,
  height = 150,
  showLabels = true,
  showValues = true,
}: AnimatedBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              {showValues && (
                <motion.span
                  className="text-xs font-bold"
                  style={{ color: item.color }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {item.value}
                </motion.span>
              )}
              <motion.div
                className="w-full rounded-t-lg relative overflow-hidden"
                style={{
                  background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}60 100%)`,
                  boxShadow: `0 0 20px ${item.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                }}
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                  }}
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, repeatDelay: 3 }}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between mt-3">
          {data.map((item, i) => (
            <motion.span
              key={i}
              className="flex-1 text-center text-xs text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.5 }}
            >
              {item.label}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}

interface HorizontalBarProps {
  data: BarData[];
  maxValue?: number;
}

export function HorizontalBarChart({ data, maxValue }: HorizontalBarProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/60">{item.label}</span>
            <span style={{ color: item.color }} className="font-bold">
              {item.value}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${item.color}80 0%, ${item.color} 100%)`,
                boxShadow: `0 0 10px ${item.color}40`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 1, delay: i * 0.15, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity, repeatDelay: 2 }}
              />
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  );
}

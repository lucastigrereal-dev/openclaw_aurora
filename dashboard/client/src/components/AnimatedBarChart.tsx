import { motion } from 'framer-motion';

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface AnimatedBarChartProps {
  data: BarData[];
  maxValue?: number;
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  animated?: boolean;
}

export function AnimatedBarChart({
  data,
  maxValue,
  height = 200,
  showLabels = true,
  showValues = true,
  animated = true,
}: AnimatedBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div
        className="flex items-end justify-around gap-2"
        style={{ height }}
      >
        {data.map((item, index) => {
          const barHeight = (item.value / max) * 100;

          return (
            <div key={item.label} className="flex flex-col items-center flex-1">
              <motion.div
                className="w-full max-w-12 rounded-t-lg relative overflow-hidden"
                initial={animated ? { height: 0 } : { height: `${barHeight}%` }}
                animate={{ height: `${barHeight}%` }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.8,
                  ease: 'easeOut',
                }}
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 20px ${item.color}50`,
                }}
              >
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent"
                  animate={{
                    y: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    delay: index * 0.2,
                  }}
                />

                {showValues && (
                  <motion.span
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold whitespace-nowrap"
                    style={{ color: item.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    {item.value}
                  </motion.span>
                )}
              </motion.div>

              {showLabels && (
                <motion.span
                  className="mt-2 text-xs text-white/60 text-center truncate w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  {item.label}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HorizontalBarChartProps {
  data: BarData[];
  maxValue?: number;
  showValues?: boolean;
}

export function HorizontalBarChart({
  data,
  maxValue,
  showValues = true,
}: HorizontalBarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div className="w-full space-y-3">
      {data.map((item, index) => {
        const barWidth = (item.value / max) * 100;

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{item.label}</span>
              {showValues && (
                <motion.span
                  style={{ color: item.color }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  {item.value}
                </motion.span>
              )}
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{
                  delay: index * 0.1,
                  duration: 0.8,
                  ease: 'easeOut',
                }}
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 10px ${item.color}`,
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                    delay: index * 0.2,
                  }}
                />
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { motion } from 'framer-motion';

interface DataPoint {
  label: string;
  value: number;
}

interface AnimatedLineChartProps {
  data: DataPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  showDots?: boolean;
  showArea?: boolean;
}

export function AnimatedLineChart({
  data,
  color = '#22d3ee',
  secondaryColor = '#8b5cf6',
  height = 120,
  showDots = true,
  showArea = true,
}: AnimatedLineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = Math.min(...data.map((d) => d.value));
  const range = maxValue - minValue || 1;
  
  const width = 100;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - ((d.value - minValue) / range) * chartHeight,
  }));

  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="w-full relative" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`lineGradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <linearGradient id={`areaGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1={padding}
            y1={padding + (chartHeight * percent) / 100}
            x2={width - padding}
            y2={padding + (chartHeight * percent) / 100}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        {showArea && (
          <motion.path
            d={areaD}
            fill={`url(#areaGradient-${color})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        )}

        {/* Main line */}
        <motion.path
          d={pathD}
          fill="none"
          stroke={`url(#lineGradient-${color})`}
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />

        {/* Data points */}
        {showDots &&
          points.map((point, i) => (
            <motion.g key={i}>
              {/* Outer glow */}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                opacity="0.3"
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
              />
              {/* Inner dot */}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="2"
                fill={color}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.1 + 0.5 }}
              />
            </motion.g>
          ))}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-white/40">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Sparkline mini chart
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, color = '#22d3ee', width = 80, height = 30 }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1 }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

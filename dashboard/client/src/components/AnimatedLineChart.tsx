import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface AnimatedLineChartProps {
  data: DataPoint[];
  color?: string;
  secondaryColor?: string;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  animated?: boolean;
}

export function AnimatedLineChart({
  data,
  color = '#22d3ee',
  secondaryColor = '#10b981',
  height = 200,
  showArea = true,
  showDots = true,
  showGrid = true,
  animated = true,
}: AnimatedLineChartProps) {
  const { path, areaPath, points, maxValue, minValue } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', points: [], maxValue: 0, minValue: 0 };

    const values = data.map((d) => d.value);
    const max = Math.max(...values) * 1.1;
    const min = Math.min(...values) * 0.9;
    const range = max - min;

    const width = 100;
    const stepX = width / (data.length - 1);

    const pts = data.map((d, i) => ({
      x: i * stepX,
      y: height - ((d.value - min) / range) * height,
      value: d.value,
      label: d.label,
    }));

    // Create smooth curve path
    let pathD = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      pathD += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Create area path
    let areaD = pathD;
    areaD += ` L ${pts[pts.length - 1].x} ${height}`;
    areaD += ` L ${pts[0].x} ${height}`;
    areaD += ' Z';

    return { path: pathD, areaPath: areaD, points: pts, maxValue: max, minValue: min };
  }, [data, height]);

  return (
    <div className="w-full relative" style={{ height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
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
        {showGrid && (
          <g opacity="0.1">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={height * ratio}
                x2="100"
                y2={height * ratio}
                stroke="white"
                strokeWidth="0.5"
              />
            ))}
            {data.map((_, i) => (
              <line
                key={i}
                x1={(i / (data.length - 1)) * 100}
                y1="0"
                x2={(i / (data.length - 1)) * 100}
                y2={height}
                stroke="white"
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {/* Area fill */}
        {showArea && areaPath && (
          <motion.path
            d={areaPath}
            fill="url(#areaGradient)"
            initial={animated ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />
        )}

        {/* Line */}
        {path && (
          <motion.path
            d={path}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#glow)"
            initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
        )}

        {/* Dots */}
        {showDots &&
          points.map((point, i) => (
            <motion.circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              filter="url(#glow)"
              initial={animated ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
            />
          ))}
      </svg>

      {/* Tooltip area - simplified for now */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-white/40 px-1">
        {data.length > 0 && (
          <>
            <span>{data[0].label}</span>
            <span>{data[data.length - 1].label}</span>
          </>
        )}
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface CircularGaugeProps {
  value: number;
  maxValue?: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  icon?: ReactNode;
}

export function CircularGauge({
  value,
  maxValue = 100,
  label,
  color = '#22d3ee',
  size = 120,
  strokeWidth = 8,
  showValue = true,
  icon,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(value / maxValue, 1);
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ opacity: 0.2, filter: 'blur(4px)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {icon && <div style={{ color }} className="mb-1">{icon}</div>}
        {showValue && (
          <motion.span
            className="text-2xl font-bold"
            style={{ color }}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {Math.round(value)}%
          </motion.span>
        )}
        <span className="text-xs text-white/50 mt-1">{label}</span>
      </div>
    </div>
  );
}

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface MultiSegmentDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
}

export function MultiSegmentDonut({
  segments,
  size = 140,
  strokeWidth = 12,
  centerValue,
  centerLabel,
}: MultiSegmentDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let currentOffset = 0;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {segments.map((segment, i) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = currentOffset;
          currentOffset += segmentLength;
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              style={{ filter: `drop-shadow(0 0 6px ${segment.color})` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue && (
          <motion.span
            className="text-3xl font-bold text-white"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {centerValue}
          </motion.span>
        )}
        {centerLabel && <span className="text-xs text-white/50">{centerLabel}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: segment.color, boxShadow: `0 0 6px ${segment.color}` }}
            />
            <span className="text-xs text-white/60">{segment.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface CircularGaugeProps {
  value: number;
  maxValue?: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  animated?: boolean;
}

export function CircularGauge({
  value,
  maxValue = 100,
  label,
  color = '#22d3ee',
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  animated = true,
}: CircularGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = (value / maxValue) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const duration = 1500;
      const startTime = Date.now();
      const startValue = displayValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(startValue + (value - startValue) * easeOut);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    } else {
      setDisplayValue(value);
    }
  }, [value, animated]);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Animated progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 10px ${color})`,
          }}
        />

        {/* Glow effect */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          opacity={0.3}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {showPercentage ? `${Math.round(displayValue)}%` : Math.round(displayValue)}
        </motion.span>
      </div>

      {/* Label */}
      <motion.p
        className="mt-2 text-sm font-semibold text-white/70"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {label}
      </motion.p>
    </div>
  );
}

interface MultiColorGaugeProps {
  segments: Array<{
    value: number;
    color: string;
    label: string;
  }>;
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function MultiColorGauge({
  segments,
  size = 180,
  strokeWidth = 12,
  centerLabel,
  centerValue,
}: MultiColorGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let currentOffset = 0;

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = currentOffset;
          currentOffset += segmentLength;

          return (
            <motion.circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.2, duration: 0.5 }}
              style={{
                filter: `drop-shadow(0 0 8px ${segment.color})`,
              }}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue && (
          <motion.span
            className="text-3xl font-bold text-cyan-400"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {centerValue}
          </motion.span>
        )}
        {centerLabel && (
          <span className="text-xs text-white/60 mt-1">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}

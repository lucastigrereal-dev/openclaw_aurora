import { motion } from 'framer-motion';
import { useState } from 'react';

interface HexagonProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  color: string;
  delay?: number;
  onClick?: () => void;
}

export function Hexagon({ icon, label, value, color, delay = 0, onClick }: HexagonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className="relative cursor-pointer group"
    >
      <svg
        viewBox="0 0 100 115"
        className="w-24 h-28 md:w-32 md:h-36"
      >
        <defs>
          <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
          <filter id={`glow-${label}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <motion.polygon
          points="50,2 95,28 95,87 50,113 5,87 5,28"
          fill={`url(#grad-${label})`}
          stroke={color}
          strokeWidth="2"
          filter={isHovered ? `url(#glow-${label})` : undefined}
          animate={{
            strokeOpacity: isHovered ? 1 : 0.5,
            scale: isHovered ? 1.05 : 1,
          }}
          style={{ transformOrigin: 'center' }}
        />

        <motion.polygon
          points="50,10 88,32 88,83 50,105 12,83 12,32"
          fill="transparent"
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.3"
          animate={{
            rotate: isHovered ? 30 : 0,
          }}
          style={{ transformOrigin: 'center' }}
          transition={{ duration: 0.5 }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <motion.div
          animate={{ scale: isHovered ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 300 }}
          style={{ color }}
        >
          {icon}
        </motion.div>
        <p className="text-xs font-semibold mt-1 text-white/80">{label}</p>
        {value && (
          <motion.p
            animate={{ opacity: isHovered ? 1 : 0.7 }}
            className="text-lg font-bold"
            style={{ color }}
          >
            {value}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

interface HexagonGridProps {
  items: Array<{
    icon: React.ReactNode;
    label: string;
    value?: string;
    color: string;
  }>;
}

export function HexagonGrid({ items }: HexagonGridProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-4">
      {items.map((item, index) => (
        <Hexagon
          key={item.label}
          {...item}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
}

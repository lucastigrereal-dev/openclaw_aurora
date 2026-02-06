import { useRef, useState, ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface Card3DProps {
  children: ReactNode;
  color?: string;
  className?: string;
  depth?: number;
  glowIntensity?: number;
}

export function Card3D({
  children,
  color = '#22d3ee',
  className = '',
  depth = 15,
  glowIntensity = 0.4,
}: Card3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [depth, -depth]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-depth, depth]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      className={`relative ${className}`}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          opacity: isHovered ? glowIntensity : 0.1,
          boxShadow: isHovered
            ? `0 0 60px ${color}50, 0 0 120px ${color}30, inset 0 0 40px ${color}10`
            : `0 0 30px ${color}20`,
        }}
        transition={{ duration: 0.4 }}
      />

      {/* Glass border */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `1px solid ${color}`,
          opacity: isHovered ? 0.6 : 0.2,
        }}
      />

      {/* Scan line effect */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
        >
          <motion.div
            className="absolute w-full h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 rounded-tl-xl" style={{ borderColor: color, opacity: 0.6 }} />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 rounded-tr-xl" style={{ borderColor: color, opacity: 0.6 }} />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 rounded-bl-xl" style={{ borderColor: color, opacity: 0.6 }} />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 rounded-br-xl" style={{ borderColor: color, opacity: 0.6 }} />

      {/* Content */}
      <div
        className="relative z-10 h-full rounded-2xl backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, rgba(10, 15, 30, 0.7) 0%, rgba(5, 10, 25, 0.8) 100%)`,
          transform: 'translateZ(20px)',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

// Metric Card with pulsing value
interface MetricCard3DProps {
  value: string | number;
  label: string;
  color?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

export function MetricCard3D({
  value,
  label,
  color = '#22d3ee',
  icon,
  trend,
  trendValue,
}: MetricCard3DProps) {
  return (
    <Card3D color={color} glowIntensity={0.5}>
      <div className="p-5 flex items-center justify-between">
        <div>
          <motion.p
            className="text-4xl font-bold tracking-tight"
            style={{ color }}
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {value}
          </motion.p>
          <p className="text-sm text-white/50 mt-1 tracking-wide">{label}</p>
          {trend && trendValue && (
            <p className={`text-xs mt-2 font-medium ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-white/40'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <motion.div
            className="p-4 rounded-xl"
            style={{ background: `${color}15`, color }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </Card3D>
  );
}

// Floating animated card
interface FloatingCardProps {
  children: ReactNode;
  color?: string;
  className?: string;
  floatIntensity?: number;
}

export function FloatingCard({
  children,
  color = '#22d3ee',
  className = '',
  floatIntensity = 8,
}: FloatingCardProps) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -floatIntensity, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Card3D color={color}>{children}</Card3D>
    </motion.div>
  );
}

// Status indicator card
interface StatusCardProps {
  title: string;
  status: 'online' | 'offline' | 'warning' | 'processing';
  details?: string;
  color?: string;
}

export function StatusCard({ title, status, details, color }: StatusCardProps) {
  const statusColors = {
    online: '#10b981',
    offline: '#ef4444',
    warning: '#f59e0b',
    processing: '#22d3ee',
  };
  
  const statusLabels = {
    online: 'ONLINE',
    offline: 'OFFLINE',
    warning: 'WARNING',
    processing: 'PROCESSING',
  };

  const cardColor = color || statusColors[status];

  return (
    <Card3D color={cardColor} glowIntensity={0.4}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white/70">{title}</span>
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: cardColor }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-bold" style={{ color: cardColor }}>
              {statusLabels[status]}
            </span>
          </div>
        </div>
        {details && <p className="text-xs text-white/40">{details}</p>}
      </div>
    </Card3D>
  );
}

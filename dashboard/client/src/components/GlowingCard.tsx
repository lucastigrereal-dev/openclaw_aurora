import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';

interface GlowingCardProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
  glowIntensity?: number;
  tiltIntensity?: number;
}

export function GlowingCard({
  children,
  color = '#22d3ee',
  className = '',
  glowIntensity = 1,
  tiltIntensity = 1,
}: GlowingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10 * tiltIntensity, -10 * tiltIntensity]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10 * tiltIntensity, 10 * tiltIntensity]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
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
      className={`relative group ${className}`}
    >
      {/* Glow effect behind card */}
      <motion.div
        className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
        animate={{
          scale: isHovered ? 1.1 : 1,
        }}
      />

      {/* Main card */}
      <motion.div
        className="relative rounded-xl border-2 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md overflow-hidden"
        style={{
          borderColor: isHovered ? color : `${color}30`,
          boxShadow: isHovered
            ? `0 0 ${30 * glowIntensity}px ${color}40, inset 0 0 ${20 * glowIntensity}px ${color}10`
            : `0 0 ${10 * glowIntensity}px ${color}20`,
        }}
        animate={{
          borderColor: isHovered ? color : `${color}30`,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at ${50 + mouseX.get() * 100}% ${50 + mouseY.get() * 100}%, ${color}20 0%, transparent 50%)`,
          }}
        />

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          animate={{
            background: [
              `linear-gradient(180deg, transparent 0%, ${color}10 50%, transparent 100%)`,
            ],
            y: ['-100%', '200%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>

        {/* Corner accents */}
        <div
          className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-lg"
          style={{ borderColor: color }}
        />
        <div
          className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg"
          style={{ borderColor: color }}
        />
        <div
          className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg"
          style={{ borderColor: color }}
        />
        <div
          className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-lg"
          style={{ borderColor: color }}
        />
      </motion.div>
    </motion.div>
  );
}

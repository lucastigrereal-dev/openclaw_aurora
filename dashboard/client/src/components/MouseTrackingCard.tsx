import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface MouseTrackingCardProps {
  children: React.ReactNode;
  color?: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'orange';
  intensity?: number;
}

const colorGradients = {
  cyan: 'from-cyan-500/20 to-blue-500/20',
  blue: 'from-blue-500/20 to-purple-500/20',
  purple: 'from-purple-500/20 to-pink-500/20',
  pink: 'from-pink-500/20 to-red-500/20',
  green: 'from-green-500/20 to-cyan-500/20',
  orange: 'from-orange-500/20 to-red-500/20',
};

const colorGlows = {
  cyan: 'shadow-[0_0_40px_rgba(34,211,238,0.4)]',
  blue: 'shadow-[0_0_40px_rgba(59,130,246,0.4)]',
  purple: 'shadow-[0_0_40px_rgba(168,85,247,0.4)]',
  pink: 'shadow-[0_0_40px_rgba(236,72,153,0.4)]',
  green: 'shadow-[0_0_40px_rgba(34,197,94,0.4)]',
  orange: 'shadow-[0_0_40px_rgba(249,115,22,0.4)]',
};

export function MouseTrackingCard({
  children,
  color = 'cyan',
  intensity = 1,
}: MouseTrackingCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current || !isHovered) return;

      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const x = (e.clientX - rect.left - centerX) / centerX;
      const y = (e.clientY - rect.top - centerY) / centerY;

      setMousePos({
        x: x * 15 * intensity,
        y: y * 15 * intensity,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered, intensity]);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="relative group"
      style={{
        perspective: '1000px',
      }}
    >
      <motion.div
        className={`
          relative rounded-xl border-2 border-transparent p-6
          bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-md
          overflow-hidden transition-all duration-300
          ${colorGlows[color]}
        `}
        animate={{
          rotateX: isHovered ? mousePos.y : 0,
          rotateY: isHovered ? mousePos.x : 0,
        }}
        transition={{
          rotateX: { type: 'spring', stiffness: 400, damping: 30 },
          rotateY: { type: 'spring', stiffness: 400, damping: 30 },
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Animated gradient background */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${colorGradients[color]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          animate={{
            x: isHovered ? mousePos.x * 2 : 0,
            y: isHovered ? mousePos.y * 2 : 0,
          }}
        />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          animate={{
            background: isHovered
              ? `radial-gradient(circle at ${50 + mousePos.x * 5}% ${50 + mousePos.y * 5}%, rgba(34,211,238,0.2) 0%, transparent 70%)`
              : 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10">{children}</div>

        {/* Border glow */}
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none"
          animate={{
            borderColor: isHovered
              ? `rgba(34,211,238,0.6)`
              : `rgba(34,211,238,0.2)`,
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
}

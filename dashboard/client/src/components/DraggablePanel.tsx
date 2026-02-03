import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, X } from 'lucide-react';

interface DraggablePanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  onRemove?: (id: string) => void;
  isDragging?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  color?: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'orange';
}

const colorClasses = {
  cyan: 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.3)]',
  blue: 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]',
  purple: 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
  pink: 'border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
  green: 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]',
  orange: 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.3)]',
};

const colorTextClasses = {
  cyan: 'text-cyan-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  pink: 'text-pink-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
};

export function DraggablePanel({
  id,
  title,
  children,
  onRemove,
  isDragging = false,
  onDragStart,
  onDragEnd,
  color = 'cyan',
}: DraggablePanelProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current || !isHovered) return;

      const rect = panelRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      setMousePos({ x: x * 0.1, y: y * 0.1 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHovered]);

  return (
    <motion.div
      ref={panelRef}
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0, y: 0 });
      }}
      className="relative group"
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
      }}
    >
      <motion.div
        className={`
          relative rounded-xl border-2 p-6 bg-gradient-to-br from-slate-900/80 to-slate-800/80
          backdrop-blur-md overflow-hidden transition-all duration-300
          ${colorClasses[color]}
          ${isDragging ? 'opacity-50 scale-95' : ''}
        `}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        {/* Animated background glow */}
        <motion.div
          className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
          animate={{
            background: [
              `radial-gradient(circle at 0% 0%, rgba(34,211,238,0.1) 0%, transparent 50%)`,
              `radial-gradient(circle at 100% 100%, rgba(34,211,238,0.1) 0%, transparent 50%)`,
              `radial-gradient(circle at 0% 0%, rgba(34,211,238,0.1) 0%, transparent 50%)`,
            ],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                drag
                dragElastic={0.2}
                onDragStart={() => onDragStart?.(id)}
                onDragEnd={onDragEnd}
                className="cursor-grab active:cursor-grabbing"
              >
                <GripVertical
                  size={18}
                  className={`${colorTextClasses[color]} opacity-60 hover:opacity-100 transition-opacity`}
                />
              </motion.div>
              <h3 className={`font-bold text-lg ${colorTextClasses[color]}`}>{title}</h3>
            </div>

            {onRemove && (
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onRemove(id)}
                className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <X size={18} className="text-red-400" />
              </motion.button>
            )}
          </div>

          {/* Body */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {children}
          </motion.div>
        </div>

        {/* Border glow effect */}
        <motion.div
          className={`absolute inset-0 rounded-xl border-2 border-transparent pointer-events-none`}
          animate={{
            borderColor: [
              `rgba(34,211,238,0)`,
              `rgba(34,211,238,0.5)`,
              `rgba(34,211,238,0)`,
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
}

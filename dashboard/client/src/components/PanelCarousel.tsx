import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PanelCarouselProps {
  panels: Array<{
    id: string;
    title: string;
    content: React.ReactNode;
    color: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'orange';
  }>;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function PanelCarousel({
  panels,
  autoPlay = true,
  autoPlayInterval = 5000,
}: PanelCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (!autoPlay || panels.length <= 1) return;

    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % panels.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, panels.length]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir > 0 ? -1000 : 1000,
      opacity: 0,
    }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => (prev + newDirection + panels.length) % panels.length);
  };

  const colorClasses = {
    cyan: 'border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.4)]',
    blue: 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.4)]',
    purple: 'border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.4)]',
    pink: 'border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.4)]',
    green: 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]',
    orange: 'border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.4)]',
  };

  const colorTextClasses = {
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.5 },
          }}
          className={`absolute inset-0 rounded-xl border-2 p-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md ${
            colorClasses[panels[current].color]
          }`}
        >
          {/* Animated background */}
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                `radial-gradient(circle at 0% 0%, rgba(34,211,238,0.2) 0%, transparent 50%)`,
                `radial-gradient(circle at 100% 100%, rgba(34,211,238,0.2) 0%, transparent 50%)`,
                `radial-gradient(circle at 0% 0%, rgba(34,211,238,0.2) 0%, transparent 50%)`,
              ],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          {/* Content */}
          <div className="relative z-10 h-full flex flex-col">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-3xl font-bold mb-6 ${colorTextClasses[panels[current].color]}`}
            >
              {panels[current].title}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex-1"
            >
              {panels[current].content}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {panels.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => paginate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 transition-colors"
          >
            <ChevronLeft size={24} className="text-cyan-400" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => paginate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-cyan-500/20 hover:bg-cyan-500/40 transition-colors"
          >
            <ChevronRight size={24} className="text-cyan-400" />
          </motion.button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {panels.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setDirection(index > current ? 1 : -1);
                  setCurrent(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === current
                    ? `${colorTextClasses[panels[current].color]} w-8`
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

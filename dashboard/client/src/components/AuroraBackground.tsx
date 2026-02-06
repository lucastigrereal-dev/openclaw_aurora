import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface AuroraBackgroundProps {
  onMessage?: (message: string) => void;
}

const reactions = [
  { trigger: 'idle', messages: ['Tudo funcionando perfeitamente.', 'Sistemas estáveis.', 'Monitorando...'] },
  { trigger: 'alert', messages: ['Atenção! Detectei algo.', 'Preciso te mostrar isso.', 'Olha só...'] },
  { trigger: 'success', messages: ['Excelente!', 'Missão cumprida!', 'Perfeito!'] },
  { trigger: 'thinking', messages: ['Deixa eu analisar...', 'Processando...', 'Um momento...'] },
];

export function AuroraBackground({ onMessage }: AuroraBackgroundProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isReacting, setIsReacting] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [depth, setDepth] = useState(0); // 0 = fundo, 1 = frente
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Mouse tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 30, damping: 20 });
  
  // Transform for parallax - Aurora moves opposite to mouse
  const auroraX = useTransform(smoothX, [0, 1], [100, -100]);
  const auroraY = useTransform(smoothY, [0, 1], [50, -50]);
  const auroraScale = useTransform(smoothY, [0, 1], [0.9, 1.1]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Random appearances from the background
  useEffect(() => {
    const appearInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        triggerAppearance('idle');
      }
    }, 15000);
    
    // Initial appearance after 5 seconds
    const initialTimer = setTimeout(() => {
      triggerAppearance('idle');
    }, 5000);

    return () => {
      clearInterval(appearInterval);
      clearTimeout(initialTimer);
    };
  }, []);

  const triggerAppearance = (trigger: string) => {
    const reaction = reactions.find(r => r.trigger === trigger) || reactions[0];
    const message = reaction.messages[Math.floor(Math.random() * reaction.messages.length)];
    
    setIsVisible(true);
    setIsReacting(true);
    setCurrentMessage(message);
    setDepth(1);
    
    if (onMessage) {
      onMessage(message);
    }

    // Fade back after showing message
    setTimeout(() => {
      setIsReacting(false);
      setCurrentMessage('');
    }, 3000);

    setTimeout(() => {
      setDepth(0);
    }, 5000);

    setTimeout(() => {
      setIsVisible(false);
    }, 8000);
  };

  // Expose trigger function globally
  useEffect(() => {
    (window as any).triggerAurora = triggerAppearance;
    return () => {
      delete (window as any).triggerAurora;
    };
  }, []);

  return (
    <>
      {/* Deep background Aurora - always slightly visible */}
      <motion.div
        className="fixed pointer-events-none z-0"
        style={{
          right: '5%',
          bottom: '10%',
          x: auroraX,
          y: auroraY,
          scale: auroraScale,
        }}
      >
        <motion.div
          className="relative"
          animate={{
            opacity: isVisible ? 0.15 : 0.05,
          }}
          transition={{ duration: 2 }}
        >
          {/* Glow effect */}
          <div 
            className="absolute -inset-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
              filter: 'blur(60px)',
            }}
          />
          
          {/* Video container */}
          <div 
            className="w-[400px] h-[400px] rounded-full overflow-hidden"
            style={{
              filter: 'blur(2px)',
              opacity: 0.6,
            }}
          >
            <video
              ref={videoRef}
              src="/assets/aurora-avatar.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Foreground Aurora - appears when reacting */}
      <AnimatePresence>
        {isVisible && depth === 1 && (
          <motion.div
            className="fixed pointer-events-none z-30"
            initial={{ 
              right: '5%',
              bottom: '-20%',
              scale: 0.5,
              opacity: 0,
            }}
            animate={{ 
              right: '10%',
              bottom: '15%',
              scale: 1,
              opacity: 1,
            }}
            exit={{ 
              right: '5%',
              bottom: '-20%',
              scale: 0.5,
              opacity: 0,
            }}
            transition={{ 
              type: 'spring',
              stiffness: 100,
              damping: 20,
              duration: 1.5,
            }}
          >
            {/* Glow ring */}
            <motion.div
              className="absolute -inset-8 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Video container */}
            <motion.div
              className="w-64 h-64 rounded-full overflow-hidden relative"
              style={{
                border: '3px solid rgba(139, 92, 246, 0.5)',
                boxShadow: '0 0 60px rgba(139, 92, 246, 0.5), 0 0 100px rgba(34, 211, 238, 0.3)',
              }}
              animate={{
                boxShadow: [
                  '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(34, 211, 238, 0.2)',
                  '0 0 80px rgba(139, 92, 246, 0.6), 0 0 120px rgba(34, 211, 238, 0.4)',
                  '0 0 40px rgba(139, 92, 246, 0.4), 0 0 80px rgba(34, 211, 238, 0.2)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <video
                src="/assets/aurora-avatar.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Speech bubble */}
            <AnimatePresence>
              {isReacting && currentMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                  className="absolute -top-4 left-1/2 -translate-x-1/2 -translate-y-full"
                >
                  <div 
                    className="px-6 py-3 rounded-2xl max-w-xs"
                    style={{
                      background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.95) 0%, rgba(10, 15, 40, 0.98) 100%)',
                      border: '1px solid rgba(139, 92, 246, 0.4)',
                      boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    <p className="text-white/90 text-sm font-medium">{currentMessage}</p>
                  </div>
                  {/* Arrow */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rotate-45"
                    style={{
                      background: 'rgba(10, 15, 40, 0.98)',
                      borderRight: '1px solid rgba(139, 92, 246, 0.4)',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.4)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle trail when Aurora moves */}
      <AnimatePresence>
        {isVisible && depth === 1 && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="fixed w-2 h-2 rounded-full pointer-events-none z-20"
                style={{
                  background: ['#8b5cf6', '#22d3ee', '#ec4899'][i % 3],
                  boxShadow: `0 0 10px ${['#8b5cf6', '#22d3ee', '#ec4899'][i % 3]}`,
                }}
                initial={{
                  right: '5%',
                  bottom: '-10%',
                  opacity: 0,
                }}
                animate={{
                  right: `${10 + Math.random() * 20}%`,
                  bottom: `${15 + Math.random() * 30}%`,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </>
  );
}

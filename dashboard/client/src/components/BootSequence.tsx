import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BootSequenceProps {
  onComplete: () => void;
}

const bootMessages = [
  { text: 'Inicializando AURORA...', duration: 400 },
  { text: 'Carregando núcleo do sistema...', duration: 300 },
  { text: 'Estabelecendo conexão WebSocket...', duration: 350 },
  { text: 'Sincronizando com OpenClaw API...', duration: 400 },
  { text: 'Carregando 67 skills...', duration: 500 },
  { text: 'Verificando integridade do sistema...', duration: 300 },
  { text: 'Inicializando módulos de automação...', duration: 350 },
  { text: 'Conectando integrações externas...', duration: 400 },
  { text: 'Sistema pronto.', duration: 300 },
];

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [phase, setPhase] = useState<'boot' | 'reveal' | 'complete'>('boot');

  useEffect(() => {
    if (phase !== 'boot') return;

    let totalDuration = 0;
    const timers: NodeJS.Timeout[] = [];

    bootMessages.forEach((msg, index) => {
      const timer = setTimeout(() => {
        setCurrentMessage(index);
        setProgress(((index + 1) / bootMessages.length) * 100);
      }, totalDuration);
      timers.push(timer);
      totalDuration += msg.duration;
    });

    const revealTimer = setTimeout(() => {
      setPhase('reveal');
    }, totalDuration + 300);
    timers.push(revealTimer);

    return () => timers.forEach(clearTimeout);
  }, []);

  // Separate effect for completion
  useEffect(() => {
    if (phase === 'reveal') {
      const completeTimer = setTimeout(() => {
        setPhase('complete');
        onComplete();
      }, 800);
      return () => clearTimeout(completeTimer);
    }
  }, [phase, onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: '#030308' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated grid background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />

          {/* Floating particles */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: ['#8b5cf6', '#22d3ee', '#ec4899', '#10b981'][i % 4],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
              }}
            />
          ))}

          {/* Central content */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Aurora Avatar */}
            <motion.div
              className="relative mb-8"
              animate={{
                rotateY: phase === 'reveal' ? 360 : 0,
              }}
              transition={{ duration: 1 }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Video container */}
              <motion.div
                className="w-40 h-40 rounded-full overflow-hidden relative"
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
                transition={{ duration: 3, repeat: Infinity }}
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

              {/* Orbiting dots */}
              {[0, 120, 240].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: ['#8b5cf6', '#22d3ee', '#ec4899'][i],
                    top: '50%',
                    left: '50%',
                    marginLeft: '-6px',
                    marginTop: '-6px',
                    boxShadow: `0 0 10px ${['#8b5cf6', '#22d3ee', '#ec4899'][i]}`,
                  }}
                  animate={{
                    x: [
                      Math.cos((angle * Math.PI) / 180) * 90,
                      Math.cos(((angle + 360) * Math.PI) / 180) * 90,
                    ],
                    y: [
                      Math.sin((angle * Math.PI) / 180) * 90,
                      Math.sin(((angle + 360) * Math.PI) / 180) * 90,
                    ],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.3,
                  }}
                />
              ))}
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-5xl font-black tracking-[0.5em] mb-2"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #22d3ee 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 60px rgba(139, 92, 246, 0.5)',
              }}
              animate={{
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              AURORA
            </motion.h1>
            <motion.p
              className="text-sm tracking-[0.3em] text-white/40 mb-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              PROMETHEUS COCKPIT
            </motion.p>

            {/* Progress bar */}
            <div className="w-80 mb-6">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #8b5cf6, #22d3ee, #ec4899)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-white/40">INITIALIZING</span>
                <span className="text-xs text-purple-400 font-mono">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Current message */}
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-6"
            >
              <p className="text-sm text-white/60 font-mono">
                {bootMessages[currentMessage]?.text}
              </p>
            </motion.div>

            {/* Terminal-style log */}
            <motion.div
              className="mt-8 w-96 h-24 rounded-lg overflow-hidden"
              style={{
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="p-3 font-mono text-[10px] text-white/40 space-y-1 overflow-hidden">
                {bootMessages.slice(0, currentMessage + 1).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-purple-400">[{String(i).padStart(2, '0')}]</span>
                    <span className={i === currentMessage ? 'text-purple-300' : 'text-white/30'}>
                      {msg.text}
                    </span>
                    {i < currentMessage && <span className="text-emerald-400">✓</span>}
                    {i === currentMessage && (
                      <motion.span
                        className="text-purple-400"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        _
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Corner decorations */}
          <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-purple-500/30 rounded-tl-xl" />
          <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-purple-500/30 rounded-tr-xl" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-purple-500/30 rounded-bl-xl" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-purple-500/30 rounded-br-xl" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

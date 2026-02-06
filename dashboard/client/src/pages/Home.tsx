import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Activity, Zap, CheckCircle, Clock, TrendingUp, 
  Cpu, Database, Wifi, Shield
} from 'lucide-react';

// Premium Glass Card with intense 3D mouse tracking - ActiveTheory style
function PremiumCard({ 
  children, 
  className = '',
  delay = 0,
  color = 'cyan',
  size = 'normal'
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
  color?: 'cyan' | 'purple' | 'pink' | 'emerald' | 'amber';
  size?: 'normal' | 'large';
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  // More responsive spring for ActiveTheory feel
  const springConfig = { stiffness: 400, damping: 30 };
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-15, 15]), springConfig);
  
  // Light reflection position
  const lightX = useSpring(useTransform(mouseX, [0, 1], [0, 100]), springConfig);
  const lightY = useSpring(useTransform(mouseY, [0, 1], [0, 100]), springConfig);

  const colorMap = {
    cyan: { 
      primary: '#22d3ee', 
      glow: 'rgba(34, 211, 238, 0.4)',
      gradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(34, 211, 238, 0.02) 100%)'
    },
    purple: { 
      primary: '#8b5cf6', 
      glow: 'rgba(139, 92, 246, 0.4)',
      gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.02) 100%)'
    },
    pink: { 
      primary: '#ec4899', 
      glow: 'rgba(236, 72, 153, 0.4)',
      gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(236, 72, 153, 0.02) 100%)'
    },
    emerald: { 
      primary: '#10b981', 
      glow: 'rgba(16, 185, 129, 0.4)',
      gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.02) 100%)'
    },
    amber: { 
      primary: '#f59e0b', 
      glow: 'rgba(245, 158, 11, 0.4)',
      gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.02) 100%)'
    },
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      style={{
        perspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative h-full rounded-2xl overflow-hidden"
        style={{
          rotateX: isHovered ? rotateX : 0,
          rotateY: isHovered ? rotateY : 0,
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.9) 0%, rgba(5, 10, 20, 0.95) 100%)',
          backdropFilter: 'blur(40px)',
          border: `1px solid ${isHovered ? colorMap[color].primary + '60' : colorMap[color].primary + '20'}`,
          boxShadow: isHovered 
            ? `0 30px 60px -15px ${colorMap[color].glow}, 0 0 0 1px ${colorMap[color].primary}30, inset 0 1px 0 0 rgba(255,255,255,0.05)`
            : `0 15px 40px -20px ${colorMap[color].glow}, inset 0 1px 0 0 rgba(255,255,255,0.03)`,
        }}
        transition={{ duration: 0.15 }}
      >
        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${colorMap[color].primary}20 0%, transparent 50%, ${colorMap[color].primary}10 100%)`,
            opacity: isHovered ? 1 : 0.3,
          }}
          animate={{
            background: isHovered 
              ? `linear-gradient(135deg, ${colorMap[color].primary}30 0%, transparent 50%, ${colorMap[color].primary}20 100%)`
              : `linear-gradient(135deg, ${colorMap[color].primary}10 0%, transparent 50%, ${colorMap[color].primary}05 100%)`,
          }}
        />

        {/* Light reflection that follows mouse */}
        <motion.div 
          className="absolute w-[200%] h-[200%] pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${colorMap[color].primary}15 0%, transparent 40%)`,
            left: useTransform(lightX, (v) => `${v - 100}%`),
            top: useTransform(lightY, (v) => `${v - 100}%`),
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Scanline effect */}
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255,255,255,0.03) 2px,
                  rgba(255,255,255,0.03) 4px
                )`,
              }}
              animate={{ y: [0, 4] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}

        {/* Top edge highlight */}
        <div 
          className="absolute top-0 left-4 right-4 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${colorMap[color].primary}40, transparent)`,
          }}
        />
        
        {/* Content with depth */}
        <div 
          className="relative z-10 h-full p-6"
          style={{ transform: 'translateZ(20px)' }}
        >
          {children}
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-6 h-6 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: colorMap[color].primary + '40' }} />
          <div className="absolute top-0 left-0 w-[1px] h-full" style={{ background: colorMap[color].primary + '40' }} />
        </div>
        <div className="absolute top-0 right-0 w-6 h-6 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[1px]" style={{ background: colorMap[color].primary + '40' }} />
          <div className="absolute top-0 right-0 w-[1px] h-full" style={{ background: colorMap[color].primary + '40' }} />
        </div>
        <div className="absolute bottom-0 left-0 w-6 h-6 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-full h-[1px]" style={{ background: colorMap[color].primary + '40' }} />
          <div className="absolute bottom-0 left-0 w-[1px] h-full" style={{ background: colorMap[color].primary + '40' }} />
        </div>
        <div className="absolute bottom-0 right-0 w-6 h-6 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-full h-[1px]" style={{ background: colorMap[color].primary + '40' }} />
          <div className="absolute bottom-0 right-0 w-[1px] h-full" style={{ background: colorMap[color].primary + '40' }} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Animated metric display with glow
function MetricValue({ value, suffix = '', prefix = '', color = '#22d3ee' }: { value: number; suffix?: string; prefix?: string; color?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.span 
      className="font-mono"
      style={{ 
        textShadow: `0 0 30px ${color}50`,
      }}
      animate={{
        textShadow: [`0 0 20px ${color}30`, `0 0 40px ${color}50`, `0 0 20px ${color}30`],
      }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      {prefix}{displayValue.toLocaleString()}{suffix}
    </motion.span>
  );
}

// Animated sparkline with glow
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${color.replace('#', '')}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <polygon
        fill={`url(#gradient-${color.replace('#', '')})`}
        points={`0,100 ${points} 100,100`}
      />
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        points={points}
        vectorEffect="non-scaling-stroke"
        filter={`url(#glow-${color.replace('#', '')})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />
    </svg>
  );
}

// Status indicator with animated pulse
function StatusPulse({ status, label }: { status: 'online' | 'warning' | 'offline'; label: string }) {
  const colors = {
    online: '#10b981',
    warning: '#f59e0b',
    offline: '#ef4444',
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <motion.div
          className="w-3 h-3 rounded-full"
          style={{ 
            background: colors[status],
            boxShadow: `0 0 10px ${colors[status]}`,
          }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [`0 0 10px ${colors[status]}`, `0 0 20px ${colors[status]}`, `0 0 10px ${colors[status]}`],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: colors[status] }}
          animate={{
            scale: [1, 2.5],
            opacity: [0.6, 0],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      <span className="text-sm text-white/70 font-medium">{label}</span>
    </div>
  );
}

// Progress bar with glow
function GlowingProgress({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-[100px]">
        <span className="text-sm text-white/60">{label}</span>
      </div>
      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className="h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 20px ${color}60`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-xs text-white/40 w-10 text-right font-mono">{value}%</span>
    </div>
  );
}

export default function Home() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sample data
  const sparklineData = [30, 45, 35, 50, 40, 60, 55, 70, 65, 80, 75, 85, 90];
  const successData = [65, 70, 68, 75, 72, 80, 78, 85, 82, 90, 88, 95, 98];
  const latencyData = [300, 280, 290, 260, 250, 240, 245, 235, 238, 234, 230, 225, 220];
  const skillsData = [40, 45, 50, 52, 55, 58, 60, 62, 64, 65, 66, 67, 67];

  return (
    <div className="min-h-full p-8">
      {/* Header Section */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl font-extralight text-white/90 tracking-wide mb-3">
          Bem-vindo ao <span className="font-semibold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AURORA</span>
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          {time.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          <span className="mx-4 text-white/20">|</span>
          <motion.span 
            className="font-mono text-cyan-400/80"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {time.toLocaleTimeString('pt-BR')}
          </motion.span>
        </p>
      </motion.div>

      {/* Main Grid - Clean Layout with spacing */}
      <div className="grid grid-cols-12 gap-6 auto-rows-fr">
        
        {/* Row 1: Key Metrics */}
        <PremiumCard className="col-span-3" delay={0.1} color="cyan">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <motion.div 
                className="p-2.5 rounded-xl"
                style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.2)' }}
                animate={{ 
                  boxShadow: ['0 0 15px rgba(34, 211, 238, 0.2)', '0 0 25px rgba(34, 211, 238, 0.3)', '0 0 15px rgba(34, 211, 238, 0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 text-cyan-400" />
              </motion.div>
              <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">Execuções</span>
            </div>
            <div className="text-5xl font-extralight text-white mb-3">
              <MetricValue value={1847} color="#22d3ee" />
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-auto">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">+12.5% hoje</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <Sparkline data={sparklineData} color="#22d3ee" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-3" delay={0.15} color="emerald">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <motion.div 
                className="p-2.5 rounded-xl"
                style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                animate={{ 
                  boxShadow: ['0 0 15px rgba(16, 185, 129, 0.2)', '0 0 25px rgba(16, 185, 129, 0.3)', '0 0 15px rgba(16, 185, 129, 0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </motion.div>
              <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">Taxa de Sucesso</span>
            </div>
            <div className="text-5xl font-extralight text-white mb-3">
              <MetricValue value={98} suffix="%" color="#10b981" />
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-auto">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">+2.3% esta semana</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <Sparkline data={successData} color="#10b981" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-3" delay={0.2} color="purple">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <motion.div 
                className="p-2.5 rounded-xl"
                style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                animate={{ 
                  boxShadow: ['0 0 15px rgba(139, 92, 246, 0.2)', '0 0 25px rgba(139, 92, 246, 0.3)', '0 0 15px rgba(139, 92, 246, 0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Clock className="w-5 h-5 text-purple-400" />
              </motion.div>
              <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">Tempo Médio</span>
            </div>
            <div className="text-5xl font-extralight text-white mb-3">
              <MetricValue value={234} suffix="ms" color="#8b5cf6" />
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-auto">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">-15ms otimizado</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <Sparkline data={latencyData} color="#8b5cf6" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-3" delay={0.25} color="amber">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <motion.div 
                className="p-2.5 rounded-xl"
                style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                animate={{ 
                  boxShadow: ['0 0 15px rgba(245, 158, 11, 0.2)', '0 0 25px rgba(245, 158, 11, 0.3)', '0 0 15px rgba(245, 158, 11, 0.2)'],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Activity className="w-5 h-5 text-amber-400" />
              </motion.div>
              <span className="text-xs text-white/50 uppercase tracking-[0.2em] font-medium">Skills Ativas</span>
            </div>
            <div className="text-5xl font-extralight text-white mb-3">
              <MetricValue value={67} color="#f59e0b" />
            </div>
            <div className="flex items-center gap-2 text-white/40 text-sm mb-auto">
              <span>de 67 disponíveis</span>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <Sparkline data={skillsData} color="#f59e0b" />
            </div>
          </div>
        </PremiumCard>

        {/* Row 2: System Status & Activity */}
        <PremiumCard className="col-span-4" delay={0.3} color="cyan">
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-semibold text-white/80 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Status do Sistema
            </h3>
            <div className="space-y-5 flex-1">
              <GlowingProgress value={45} color="#22d3ee" label="CPU" />
              <GlowingProgress value={62} color="#8b5cf6" label="Memória" />
              <GlowingProgress value={28} color="#10b981" label="Rede" />
              <GlowingProgress value={71} color="#f59e0b" label="Disco" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-4" delay={0.35} color="purple">
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-semibold text-white/80 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-400" />
              Conexões
            </h3>
            <div className="space-y-4 flex-1">
              <StatusPulse status="online" label="OpenClaw API" />
              <StatusPulse status="online" label="WebSocket" />
              <StatusPulse status="online" label="Kommo CRM" />
              <StatusPulse status="online" label="Notion" />
              <StatusPulse status="warning" label="Telegram Bot" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="col-span-4" delay={0.4} color="pink">
          <div className="flex flex-col h-full">
            <h3 className="text-sm font-semibold text-white/80 mb-6 uppercase tracking-[0.15em] flex items-center gap-2">
              <Activity className="w-4 h-4 text-pink-400" />
              Atividade Recente
            </h3>
            <div className="space-y-3 text-sm flex-1">
              {[
                { time: '2s', text: 'Skill executada: sync_notion', color: '#22d3ee' },
                { time: '15s', text: 'Lead criado no Kommo', color: '#10b981' },
                { time: '32s', text: 'Webhook recebido', color: '#8b5cf6' },
                { time: '1m', text: 'Backup automático', color: '#f59e0b' },
                { time: '2m', text: 'Skill executada: send_report', color: '#ec4899' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  className="flex items-center gap-4 py-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  <span className="text-xs text-white/30 w-8 font-mono">{item.time}</span>
                  <motion.div 
                    className="w-2 h-2 rounded-full"
                    style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                    animate={{ 
                      scale: [1, 1.3, 1],
                      boxShadow: [`0 0 8px ${item.color}`, `0 0 15px ${item.color}`, `0 0 8px ${item.color}`],
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                  />
                  <span className="text-white/60 truncate">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </PremiumCard>

      </div>
    </div>
  );
}

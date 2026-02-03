import { useState, useEffect, ReactNode, useRef } from 'react';
import { AuroraAvatar } from './AuroraAvatar';
import { AuroraBackground } from './AuroraBackground';
import { ParticleField } from './ParticleField';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import {
  Home, Radio, Terminal, Zap, GitBranch, Link2,
  Bot, DollarSign, Play, Activity
} from 'lucide-react';

interface CockpitLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'HOME', icon: Home, color: '#22d3ee' },
  { path: '/gateway', label: 'GATEWAY', icon: Radio, color: '#8b5cf6' },
  { path: '/logs', label: 'LOGS', icon: Terminal, color: '#10b981' },
  { path: '/skills', label: 'SKILLS', icon: Zap, color: '#f59e0b' },
  { path: '/flows', label: 'FLOWS', icon: GitBranch, color: '#ec4899' },
  { path: '/connectors', label: 'CONNECTORS', icon: Link2, color: '#06b6d4' },
  { path: '/automation', label: 'AUTOMATION', icon: Bot, color: '#a855f7' },
  { path: '/costs', label: 'COSTS', icon: DollarSign, color: '#84cc16' },
  { path: '/executions', label: 'EXECUTIONS', icon: Play, color: '#f97316' },
  { path: '/health', label: 'HEALTH', icon: Activity, color: '#ef4444' },
];

export function CockpitLayout({ children }: CockpitLayoutProps) {
  const [location] = useLocation();
  const [time, setTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for parallax
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  // Smooth spring for mouse movement
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  // Transform for parallax effect
  const bgX = useTransform(smoothX, [0, 1], [-30, 30]);
  const bgY = useTransform(smoothY, [0, 1], [-30, 30]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  const currentNav = navItems.find(item => item.path === location) || navItems[0];

  return (
    <div 
      ref={containerRef}
      className="min-h-screen w-full relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #020208 0%, #0a0a18 50%, #050510 100%)'
      }}
    >
      {/* Deep space background with parallax */}
      <motion.div 
        className="fixed inset-0 pointer-events-none"
        style={{ x: bgX, y: bgY }}
      >
        {/* Gradient orbs */}
        <div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.15) 0%, transparent 60%)',
            left: '10%',
            top: '10%',
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
            right: '10%',
            bottom: '20%',
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 60%)',
            left: '50%',
            top: '60%',
            filter: 'blur(80px)',
          }}
        />
      </motion.div>

      {/* Particle Field */}
      <ParticleField />

      {/* Subtle grid */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Logo */}
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative w-12 h-12"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${currentNav.color}30 0%, ${currentNav.color}10 100%)`,
                  border: `1px solid ${currentNav.color}30`,
                }}
                animate={{
                  boxShadow: [
                    `0 0 20px ${currentNav.color}20`,
                    `0 0 40px ${currentNav.color}30`,
                    `0 0 20px ${currentNav.color}20`,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className="text-2xl font-black"
                  style={{ color: currentNav.color }}
                >
                  A
                </span>
              </div>
            </motion.div>
            <div>
              <h1 
                className="text-xl font-bold tracking-[0.3em]"
                style={{ color: currentNav.color }}
              >
                AURORA
              </h1>
              <p className="text-[10px] text-white/30 tracking-[0.2em]">PROMETHEUS COCKPIT</p>
            </div>
          </div>

          {/* Center - Status */}
          <div className="flex items-center gap-8">
            <StatusIndicator label="SYSTEM" color="#10b981" />
            <StatusIndicator label="API" color="#22d3ee" />
            <StatusIndicator label="WS" color="#8b5cf6" />
          </div>

          {/* Right - Time */}
          <motion.div 
            className="text-3xl font-light tracking-[0.2em] text-white/60 font-mono"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </motion.div>
        </motion.div>
      </header>

      {/* Left Navigation */}
      <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-40">
        <motion.div 
          className="flex flex-col gap-3"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {navItems.map((item, index) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <motion.div
                  className="relative group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                  whileHover={{ x: 8 }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: isActive 
                        ? `linear-gradient(135deg, ${item.color}25 0%, ${item.color}10 100%)`
                        : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? item.color + '40' : 'rgba(255,255,255,0.05)'}`,
                    }}
                    whileHover={{
                      background: `linear-gradient(135deg, ${item.color}20 0%, ${item.color}08 100%)`,
                      border: `1px solid ${item.color}30`,
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon 
                      size={20} 
                      style={{ 
                        color: isActive ? item.color : 'rgba(255,255,255,0.4)'
                      }} 
                    />
                    
                    {isActive && (
                      <>
                        <motion.div
                          className="absolute inset-0"
                          style={{
                            background: `radial-gradient(circle at center, ${item.color}15 0%, transparent 70%)`,
                          }}
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <motion.div
                          className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full"
                          style={{ background: item.color }}
                          layoutId="nav-indicator"
                        />
                      </>
                    )}
                  </motion.div>
                  
                  {/* Tooltip */}
                  <motion.div
                    className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none"
                    style={{
                      background: 'rgba(10, 10, 20, 0.95)',
                      border: `1px solid ${item.color}30`,
                      boxShadow: `0 0 30px ${item.color}20`,
                    }}
                  >
                    <span 
                      className="text-sm font-semibold tracking-wider"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </nav>

      {/* Main Content */}
      <main className="min-h-screen pl-28 pr-8 pt-28 pb-8">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Corner accents */}
      <div className="fixed top-6 right-6 w-16 h-16 pointer-events-none">
        <div className="absolute top-0 right-0 w-8 h-[1px] bg-gradient-to-l from-cyan-500/30 to-transparent" />
        <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-cyan-500/30 to-transparent" />
      </div>
      <div className="fixed bottom-6 left-6 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-0 left-0 w-8 h-[1px] bg-gradient-to-r from-cyan-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-[1px] h-8 bg-gradient-to-t from-cyan-500/30 to-transparent" />
      </div>

      {/* Aurora Background - aparece do fundo */}
      <AuroraBackground />

      {/* Aurora Avatar - chat no canto */}
      <AuroraAvatar />
    </div>
  );
}

function StatusIndicator({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ background: color }}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="text-xs text-white/40 tracking-wider font-medium">{label}</span>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Home,
  Radio,
  FileText,
  Zap,
  GitBranch,
  Plug,
  Wand2,
  DollarSign,
  Activity,
  Heart,
  Power,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface GameLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const pages = [
  { id: 'home', label: 'HOME', icon: Home, color: '#22d3ee' },
  { id: 'gateway', label: 'GATEWAY', icon: Radio, color: '#3b82f6' },
  { id: 'logs', label: 'LOGS', icon: FileText, color: '#8b5cf6' },
  { id: 'skills', label: 'SKILLS', icon: Zap, color: '#f59e0b' },
  { id: 'flows', label: 'FLOWS', icon: GitBranch, color: '#10b981' },
  { id: 'connectors', label: 'CONNECTORS', icon: Plug, color: '#ec4899' },
  { id: 'automation', label: 'AUTOMATION', icon: Wand2, color: '#06b6d4' },
  { id: 'costs', label: 'COSTS', icon: DollarSign, color: '#84cc16' },
  { id: 'executions', label: 'EXECUTIONS', icon: Activity, color: '#f97316' },
  { id: 'health', label: 'HEALTH', icon: Heart, color: '#ef4444' },
];

export function GameLayout({ children, currentPage, onPageChange }: GameLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [notifications, setNotifications] = useState(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const springX = useSpring(cursorX, { stiffness: 500, damping: 50 });
  const springY = useSpring(cursorY, { stiffness: 500, damping: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cursorX, cursorY]);

  const currentPageData = pages.find((p) => p.id === currentPage) || pages[0];

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-[#0a0a0f] text-white overflow-hidden relative"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Mouse follower glow */}
      <motion.div
        className="fixed pointer-events-none z-50 w-96 h-96 rounded-full"
        style={{
          x: springX,
          y: springY,
          translateX: '-50%',
          translateY: '-50%',
          background: `radial-gradient(circle, ${currentPageData.color}15 0%, transparent 70%)`,
        }}
      />

      {/* Top HUD Bar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="absolute top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-6"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, transparent 100%)',
        }}
      >
        {/* Left section */}
        <div className="flex items-center gap-6">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${currentPageData.color}40 0%, ${currentPageData.color}10 100%)`,
                boxShadow: `0 0 20px ${currentPageData.color}40`,
              }}
            >
              <span className="text-xl font-bold" style={{ color: currentPageData.color }}>
                K
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider" style={{ color: currentPageData.color }}>
                KRONOS
              </h1>
              <p className="text-[10px] text-white/40 tracking-widest">COCKPIT v2.0</p>
            </div>
          </motion.div>

          {/* Status indicators */}
          <div className="flex items-center gap-4 ml-8">
            <StatusIndicator label="SYSTEM" status="online" color="#10b981" />
            <StatusIndicator label="API" status="online" color="#22d3ee" />
            <StatusIndicator label="WS" status="online" color="#8b5cf6" />
          </div>
        </div>

        {/* Center - Current page */}
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3"
        >
          <currentPageData.icon size={24} style={{ color: currentPageData.color }} />
          <span
            className="text-2xl font-bold tracking-widest"
            style={{ color: currentPageData.color }}
          >
            {currentPageData.label}
          </span>
        </motion.div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 size={20} className="text-cyan-400" />
            ) : (
              <VolumeX size={20} className="text-white/40" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Bell size={20} className="text-cyan-400" />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
              >
                {notifications}
              </motion.span>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings size={20} className="text-white/60" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(239,68,68,0.5)' }}
            whileTap={{ scale: 0.95 }}
            className="ml-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400 font-semibold"
          >
            <Power size={18} />
            <span className="text-sm">KILL</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Left Navigation */}
      <motion.nav
        initial={{ x: -100 }}
        animate={{ x: 0, width: sidebarCollapsed ? 80 : 240 }}
        className="absolute left-0 top-20 bottom-20 z-30 flex flex-col"
        style={{
          background: 'linear-gradient(90deg, rgba(10,10,15,0.95) 0%, transparent 100%)',
        }}
      >
        <div className="flex-1 py-4 space-y-2 px-3">
          {pages.map((page, index) => {
            const Icon = page.icon;
            const isActive = currentPage === page.id;

            return (
              <motion.button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
                  isActive ? '' : 'hover:bg-white/5'
                }`}
                style={{
                  background: isActive
                    ? `linear-gradient(90deg, ${page.color}30 0%, transparent 100%)`
                    : 'transparent',
                  borderLeft: isActive ? `3px solid ${page.color}` : '3px solid transparent',
                }}
              >
                {/* Active glow */}
                {isActive && (
                  <motion.div
                    layoutId="activeGlow"
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `radial-gradient(circle at 0% 50%, ${page.color} 0%, transparent 70%)`,
                    }}
                  />
                )}

                <Icon
                  size={22}
                  style={{ color: isActive ? page.color : 'rgba(255,255,255,0.5)' }}
                />

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-semibold tracking-wider whitespace-nowrap overflow-hidden"
                      style={{ color: isActive ? page.color : 'rgba(255,255,255,0.6)' }}
                    >
                      {page.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Collapse button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mb-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={20} className="text-cyan-400" />
          ) : (
            <ChevronLeft size={20} className="text-cyan-400" />
          )}
        </motion.button>
      </motion.nav>

      {/* Main Content Area */}
      <motion.main
        animate={{
          marginLeft: sidebarCollapsed ? 80 : 240,
        }}
        className="absolute top-20 bottom-4 right-4 overflow-hidden"
        style={{
          left: sidebarCollapsed ? 80 : 240,
        }}
      >
        <div className="h-full overflow-auto px-6 py-4 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      {/* Bottom HUD Bar */}
      <motion.footer
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="absolute bottom-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-6"
        style={{
          background: 'linear-gradient(0deg, rgba(10,10,15,0.95) 0%, transparent 100%)',
        }}
      >
        {/* Left stats */}
        <div className="flex items-center gap-6">
          <StatBox label="CPU" value="23%" color="#22d3ee" />
          <StatBox label="MEM" value="4.2GB" color="#10b981" />
          <StatBox label="DISK" value="67%" color="#f59e0b" />
        </div>

        {/* Center - Time */}
        <div className="text-center">
          <p className="text-2xl font-mono text-cyan-400">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs text-white/40">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
          </p>
        </div>

        {/* Right stats */}
        <div className="flex items-center gap-6">
          <StatBox label="LATENCY" value="45ms" color="#8b5cf6" />
          <StatBox label="UPTIME" value="99.8%" color="#10b981" />
          <StatBox label="EVENTS" value="1.2K" color="#ec4899" />
        </div>
      </motion.footer>

      {/* Scan line effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
    </div>
  );
}

function StatusIndicator({ label, status, color }: { label: string; status: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

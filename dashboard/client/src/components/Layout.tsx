import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ActivityPanel } from './ActivityPanel';
import { WebSocketStatus } from './WebSocketStatus';
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
  User,
  Menu,
  X,
} from 'lucide-react';
import { useSystem } from '@/contexts/SystemContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  onKillSwitch: () => void;
}

const pages = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'gateway', label: 'Gateway', icon: Radio },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'skills', label: 'Skills', icon: Zap },
  { id: 'flows', label: 'Flows', icon: GitBranch },
  { id: 'connectors', label: 'Connectors', icon: Plug },
  { id: 'automation', label: 'Automation', icon: Wand2 },
  { id: 'costs', label: 'Costs', icon: DollarSign },
  { id: 'executions', label: 'Executions', icon: Activity },
  { id: 'health', label: 'Health', icon: Heart },
];

export function Layout({ children, currentPage, onPageChange, onKillSwitch }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);
  const { status } = useSystem();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'reconnecting':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.3 }}
        className="bg-card border-r border-border flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <motion.div
              initial={false}
              animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <h1 className="text-lg font-bold neon-glow whitespace-nowrap">PROMETHEUS</h1>
            </motion.div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {pages.map((page) => {
            const Icon = page.icon;
            const isActive = currentPage === page.id;

            return (
              <motion.button
                key={page.id}
                onClick={() => onPageChange(page.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-accent text-accent-foreground neon-border-active'
                    : 'hover:bg-secondary text-foreground/70 hover:text-foreground'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <motion.span
                  initial={false}
                  animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {page.label}
                </motion.span>
              </motion.button>
            );
          })}
        </nav>

        {/* Footer Status */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="text-xs space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status.moltbot)}`} />
              <motion.span
                initial={false}
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap text-foreground/60"
              >
                v2.0.0
              </motion.span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status.moltbot)}`} />
              <motion.span
                initial={false}
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap text-foreground/60"
              >
                MOLTBOT
              </motion.span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status.moltbot)}`} />
              <motion.span
                initial={false}
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap text-foreground/60"
              >
                {status.moltbot === 'online' ? '● ONLINE' : '○ OFFLINE'}
              </motion.span>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-8 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {pages.find((p) => p.id === currentPage)?.label || 'Dashboard'}
          </h2>

          <div className="flex items-center gap-4">
            {/* Status indicators */}
            <div className="flex items-center gap-3">
              <WebSocketStatus />
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status.ollama)}`} />
                <span className="text-foreground/60">Ollama</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-foreground/60">Telegram</span>
              </div>
            </div>

            {/* Action buttons */}
            <motion.button
              onClick={() => setActivityPanelOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold"
                >
                  {notificationCount}
                </motion.span>
              )}
            </motion.button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <User size={20} />
            </button>

            {/* Kill switch */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onKillSwitch}
              className="ml-4 p-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              <Power size={20} />
            </motion.button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Activity Panel */}
      <ActivityPanel isOpen={activityPanelOpen} onClose={() => setActivityPanelOpen(false)} />
    </div>
  );
}

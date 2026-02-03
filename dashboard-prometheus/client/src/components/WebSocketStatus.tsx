import { motion } from 'framer-motion';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocketContext } from '@/contexts/WebSocketContext';

export function WebSocketStatus() {
  const { isConnected, isConnecting, error } = useWebSocketContext();

  if (isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Wifi size={14} className="text-green-500" />
        </motion.div>
        <span className="text-xs font-semibold text-green-500">LIVE</span>
      </motion.div>
    );
  }

  if (isConnecting) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Wifi size={14} className="text-yellow-500" />
        </motion.div>
        <span className="text-xs font-semibold text-yellow-500">CONECTANDO...</span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg"
        title={error.message}
      >
        <AlertCircle size={14} className="text-red-500" />
        <span className="text-xs font-semibold text-red-500">ERRO</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 border border-gray-500/30 rounded-lg"
    >
      <WifiOff size={14} className="text-gray-500" />
      <span className="text-xs font-semibold text-gray-500">OFFLINE</span>
    </motion.div>
  );
}

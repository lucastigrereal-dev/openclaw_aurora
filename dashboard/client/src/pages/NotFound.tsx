import { motion } from 'framer-motion';
import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Pulsing rings */}
        <div className="relative w-32 h-32 mx-auto mb-12">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 border-2 border-destructive rounded-full"
          />
          <motion.div
            animate={{ scale: [1.2, 1.4, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-0 border border-destructive/50 rounded-full"
          />
          <motion.div
            animate={{ scale: [1.4, 1.6, 1.4], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 border border-destructive/25 rounded-full"
          />

          {/* Center core */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-8 bg-destructive rounded-full"
            style={{
              boxShadow: '0 0 20px rgba(255, 0, 0, 0.5)',
            }}
          />
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-6xl font-bold mb-4 text-destructive neon-glow"
        >
          404
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-foreground/70 mb-8 text-lg"
        >
          PÁGINA NÃO ENCONTRADA
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-muted-foreground mb-8 text-sm"
        >
          A rota solicitada não existe no cockpit PROMETHEUS
        </motion.p>

        {/* Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLocation('/')}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-semibold"
        >
          Voltar ao Home
        </motion.button>
      </motion.div>
    </div>
  );
}

import { motion } from 'framer-motion';

interface NotificationBadgeProps {
  count: number;
  variant?: 'error' | 'warning' | 'success' | 'info';
}

export function NotificationBadge({ count, variant = 'error' }: NotificationBadgeProps) {
  if (count === 0) return null;

  const colorMap = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
  };

  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      className={`absolute top-1 right-1 w-5 h-5 ${colorMap[variant]} rounded-full flex items-center justify-center text-xs text-white font-bold`}
    >
      {count > 9 ? '9+' : count}
    </motion.span>
  );
}

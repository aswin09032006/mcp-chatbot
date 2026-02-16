import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-creozen-card border border-creozen-border shadow-2xl min-w-[300px]"
    >
      <div className={`w-2 h-2 rounded-full ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-emerald-500' : 
        'bg-blue-500'
      }`} />
      <p className="flex-1 text-sm text-creozen-text-primary font-medium">{message}</p>
      <button 
        onClick={onClose}
        className="p-1 hover:bg-creozen-text-primary/10 rounded-lg transition-colors text-creozen-text-muted hover:text-creozen-text-primary"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

export default Toast;

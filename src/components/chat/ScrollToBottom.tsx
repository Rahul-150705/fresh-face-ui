import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export default function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-sm transition-all hover:scale-105"
          style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          New content below
        </motion.button>
      )}
    </AnimatePresence>
  );
}

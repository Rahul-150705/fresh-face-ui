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
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-[#1e1f20] border border-[#444746] text-[#e3e3e3] shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-all hover:scale-105 cursor-pointer"
          style={{ boxShadow: 'var(--shadow-glass)' }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          New content below
        </motion.button>
      )}
    </AnimatePresence>
  );
}

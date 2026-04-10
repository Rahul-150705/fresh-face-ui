import { motion } from 'framer-motion';

interface ChatEmptyStateProps {
  userName?: string;
}

export default function ChatEmptyState({ userName }: ChatEmptyStateProps) {
  const firstName = userName ? userName.split(' ')[0] : 'there';

  return (
    <div className="w-full flex-col flex items-center justify-center pt-8 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center w-full max-w-2xl px-4"
      >
        <h1 className="text-[2.75rem] font-medium tracking-tight mb-3 text-[#e3e3e3]">
          Hello, {firstName}
        </h1>
        <h2 className="text-[2.75rem] font-medium tracking-tight text-[#c4c7c5]">
          How can I help you today?
        </h2>
      </motion.div>
    </div>
  );
}

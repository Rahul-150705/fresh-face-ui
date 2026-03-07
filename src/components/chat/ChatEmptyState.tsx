import { motion } from 'framer-motion';
import { Sparkles, Upload, FileText, Brain, MessageSquare } from 'lucide-react';

interface ChatEmptyStateProps {
  onUploadClick: () => void;
  userName?: string;
}

const FEATURES = [
  { icon: FileText, text: 'AI-powered lecture summaries' },
  { icon: MessageSquare, text: 'Ask questions about your content' },
  { icon: Brain, text: 'Generate quizzes to test your knowledge' },
];

export default function ChatEmptyState({ onUploadClick, userName }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6 max-w-lg text-center"
      >
        {/* Logo */}
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary"
          style={{ boxShadow: 'var(--shadow-brand)' }}
        >
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </motion.div>

        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {userName ? `Hi ${userName.split(' ')[0]}, how can I help?` : 'How can I help you learn today?'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            Upload a PDF lecture to get started. I'll generate a summary, and then you can ask questions about it.
          </p>
        </div>

        {/* Upload CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onUploadClick}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary transition-all hover:opacity-90"
          style={{ boxShadow: 'var(--shadow-brand)' }}
        >
          <Upload className="w-4 h-4" />
          Upload a PDF Lecture
        </motion.button>

        {/* Feature list */}
        <div className="w-full space-y-2 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What you can do</p>
          <div className="grid gap-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card text-sm text-muted-foreground"
              >
                <f.icon className="w-4 h-4 text-foreground shrink-0" />
                {f.text}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}


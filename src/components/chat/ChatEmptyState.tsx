import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, MessageSquare, Brain, Sparkles, ArrowRight } from 'lucide-react';

interface ChatEmptyStateProps {
  onUploadClick: (mode: 'chat' | 'summary') => void;
  userName?: string;
}

export default function ChatEmptyState({ onUploadClick, userName }: ChatEmptyStateProps) {
  const greeting = userName ? `Hello, ${userName.split(' ')[0]}` : 'Hello there';
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      onUploadClick('summary');
    }
  }, [onUploadClick]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2">
            {greeting} 👋
          </h1>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Upload a lecture PDF and I'll help you study smarter with summaries, Q&A, and quizzes.
          </p>
        </motion.div>

        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => onUploadClick('summary')}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group ${
              dragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border hover:border-primary/40 hover:bg-muted/30'
            }`}
          >
            <AnimatePresence mode="wait">
              {dragOver ? (
                <motion.div
                  key="drop"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)' }}>
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-base font-bold text-primary">Drop your PDF here</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground mb-1">
                      Drop your PDF here, or click to upload
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Lecture notes, textbooks, research papers — up to 10 MB
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Action cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="grid sm:grid-cols-2 gap-3 mb-8"
        >
          {[
            {
              mode: 'chat' as const,
              icon: MessageSquare,
              title: 'Chat with PDF',
              desc: 'Interactive Q&A — ask anything',
            },
            {
              mode: 'summary' as const,
              icon: FileText,
              title: 'Summarize PDF',
              desc: 'Key points, definitions, exam tips',
            },
          ].map((item, i) => (
            <motion.button
              key={item.mode}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onUploadClick(item.mode)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all text-left group"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </motion.button>
          ))}
        </motion.div>

        {/* Capability chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {[
            { icon: MessageSquare, label: 'RAG-powered Q&A' },
            { icon: FileText, label: 'Structured summaries' },
            { icon: Brain, label: 'AI-generated quizzes' },
          ].map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-xs text-muted-foreground font-medium"
            >
              <s.icon className="w-3.5 h-3.5 text-primary" />
              {s.label}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

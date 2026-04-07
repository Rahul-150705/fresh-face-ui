import { motion } from 'framer-motion';
import { Upload, FileText, MessageSquare, Brain, Sparkles, ArrowUpRight } from 'lucide-react';

interface ChatEmptyStateProps {
  onUploadClick: (mode: 'chat' | 'summary') => void;
  userName?: string;
}

const SUGGESTIONS = [
  { icon: MessageSquare, label: 'Chat with your PDF', desc: 'Ask questions, get precise answers' },
  { icon: FileText, label: 'Summarize a lecture', desc: 'Key points, definitions, exam tips' },
  { icon: Brain, label: 'Generate a quiz', desc: 'Test your understanding instantly' },
];

export default function ChatEmptyState({ onUploadClick, userName }: ChatEmptyStateProps) {
  const greeting = userName ? `Hello, ${userName.split(' ')[0]}` : 'Hello';

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl mx-auto">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-3">
            {greeting}
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload a PDF to get started. I'll help you learn smarter.
          </p>
        </motion.div>

        {/* Upload area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-10"
        >
          <div className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-10 text-center hover:border-primary/30 transition-colors group cursor-pointer bg-muted/30"
            onClick={() => onUploadClick('summary')}>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/15 transition-colors">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              Drop your PDF here, or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              Supports lecture notes, textbooks, research papers (up to 10 MB)
            </p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid sm:grid-cols-2 gap-3 mb-10"
        >
          <button
            onClick={() => onUploadClick('chat')}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/20 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Chat with PDF</p>
              <p className="text-xs text-muted-foreground">Interactive Q&A conversation</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>

          <button
            onClick={() => onUploadClick('summary')}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:border-primary/20 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Summarize PDF</p>
              <p className="text-xs text-muted-foreground">AI-generated structured summary</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {SUGGESTIONS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-border bg-card text-xs text-muted-foreground"
            >
              <s.icon className="w-3.5 h-3.5 text-primary" />
              <span>{s.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

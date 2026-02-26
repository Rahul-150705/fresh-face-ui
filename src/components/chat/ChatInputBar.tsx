import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Send, Loader2, FileText } from 'lucide-react';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isAnswering?: boolean;
  hasLecture?: boolean;
}

const MAX_MB = 10;

export default function ChatInputBar({
  onSendMessage,
  onFileSelect,
  disabled,
  isStreaming,
  isAnswering,
  hasLecture,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder = isStreaming
    ? 'AI is generating summary...'
    : isAnswering
      ? 'Thinking...'
      : hasLecture
        ? 'Ask a question about this lecture...'
        : 'Upload a PDF to get started...';

  const canSend = text.trim().length > 0 && !disabled && !isStreaming && !isAnswering && hasLecture;

  const handleSubmit = useCallback(() => {
    if (!canSend) return;
    onSendMessage(text.trim());
    setText('');
  }, [canSend, text, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return;
    if (file.size > MAX_MB * 1024 * 1024) return;
    onFileSelect(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        {/* File upload button */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileRef.current?.click()}
          disabled={isStreaming || isAnswering}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-40"
          title="Upload PDF"
        >
          <Plus className="w-5 h-5" />
        </motion.button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isStreaming || !hasLecture}
            rows={1}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all disabled:opacity-50 max-h-32"
            style={{ minHeight: '42px' }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 128) + 'px';
            }}
          />
        </div>

        {/* Send button */}
        <motion.button
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          onClick={handleSubmit}
          disabled={!canSend}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-primary-foreground transition-all disabled:opacity-30"
          style={{
            background: canSend ? 'var(--gradient-brand)' : 'hsl(var(--muted))',
            boxShadow: canSend ? 'var(--shadow-brand)' : 'none',
          }}
        >
          {isAnswering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </motion.button>
      </div>
    </div>
  );
}

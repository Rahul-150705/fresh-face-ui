import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Paperclip, ArrowUp, Square, Loader2 } from 'lucide-react';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  onFileSelect: (file: File) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isAnswering?: boolean;
  hasLecture?: boolean;
}

const MAX_MB = 10;

export default function ChatInputBar({
  onSendMessage,
  onFileSelect,
  onStop,
  disabled,
  isStreaming,
  isAnswering,
  hasLecture,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const placeholder = isStreaming
    ? 'AI is generating…'
    : isAnswering
      ? 'Thinking…'
      : hasLecture
        ? 'Ask anything about your PDF…'
        : 'Upload a PDF to start…';

  const canSend = text.trim().length > 0 && !disabled && !isStreaming && !isAnswering;
  const showStop = isStreaming && onStop;

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
    <div className="shrink-0 pb-5 pt-2 px-4">
      <div className="max-w-3xl mx-auto">
        <div
          className={`relative flex items-end gap-2 rounded-2xl border bg-card transition-all duration-300 ${
            focused
              ? 'border-primary/40 shadow-[0_0_0_3px_hsl(var(--primary)/0.08),0_4px_24px_-4px_hsl(var(--primary)/0.12)]'
              : 'border-border shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)]'
          }`}
        >
          {/* File upload */}
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isStreaming || isAnswering}
            className="p-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 shrink-0"
            title="Upload PDF"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isStreaming || isAnswering}
            rows={1}
            className="flex-1 resize-none bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 max-h-36"
            style={{ minHeight: '44px' }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 144) + 'px';
            }}
          />

          {/* Send / Stop */}
          <div className="p-2 shrink-0">
            {showStop ? (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onStop}
                className="w-8 h-8 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center transition-colors"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={canSend ? { scale: 1.08 } : {}}
                whileTap={canSend ? { scale: 0.92 } : {}}
                onClick={handleSubmit}
                disabled={!canSend}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  canSend
                    ? 'text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
                style={canSend ? { background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' } : undefined}
              >
                {isAnswering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </motion.button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-2.5 opacity-60">
          LearnAI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}

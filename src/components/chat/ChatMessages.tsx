import { useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ChatMessageBubble, { type ChatMessage } from './ChatMessageBubble';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  isAnswering: boolean;
  streamingContent: string;
}

export default function ChatMessages({ messages, isStreaming, isAnswering, streamingContent }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const isNearBottom = (el: HTMLElement, threshold = 120) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

  useEffect(() => {
    if (scrollRef.current && (isStreaming || isAnswering)) {
      if (!userScrolledUpRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [streamingContent, isStreaming, messages, isAnswering]);

  useEffect(() => {
    if (scrollRef.current && !userScrolledUpRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    userScrolledUpRef.current = !isNearBottom(scrollRef.current);
  }, []);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto py-8 scroll-smooth"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-7">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isAnswering && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--gradient-brand)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground mb-2">LearnAI</p>
              <div className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-muted/60 border border-border">
                <div className="progress-dots">
                  <span /><span /><span />
                </div>
                <span className="text-xs text-muted-foreground ml-1">Thinking…</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

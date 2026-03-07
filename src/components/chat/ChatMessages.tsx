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

  const isNearBottom = (el: HTMLElement, threshold = 100) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

  useEffect(() => {
    if (scrollRef.current && (isStreaming || isAnswering)) {
      if (!userScrolledUpRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [streamingContent, isStreaming, messages, isAnswering]);

  useEffect(() => {
    if (scrollRef.current && !userScrolledUpRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      className="flex-1 overflow-y-auto py-6 relative"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isAnswering && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary text-primary-foreground">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="progress-dots">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}
      </div>


    </div>
  );
}

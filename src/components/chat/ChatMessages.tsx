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
      className="flex-1 overflow-y-auto py-8 scroll-smooth z-10 relative"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-7">
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* The streaming message is already mapped natively in messages alongside previous history, with no need for a duplicate hard-coded thinking box. */}
      </div>
    </div>
  );
}

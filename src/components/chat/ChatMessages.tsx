import { useRef, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import ChatMessageBubble, { type ChatMessage } from './ChatMessageBubble';
import ScrollToBottom from './ScrollToBottom';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  isAnswering: boolean;
  streamingContent: string;
}

export default function ChatMessages({ messages, isStreaming, isAnswering, streamingContent }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isNearBottom = (el: HTMLElement, threshold = 200) =>
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

  useEffect(() => {
    if (scrollRef.current && (isStreaming || isAnswering)) {
      if (!userScrolledUpRef.current) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
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
    const nearBottom = isNearBottom(scrollRef.current);
    userScrolledUpRef.current = !nearBottom;
    setShowScrollBtn(!nearBottom);
  }, []);

  const handleScrollToBottom = () => {
    if (scrollRef.current) {
      userScrolledUpRef.current = false;
      setShowScrollBtn(false);
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <>
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onWheel={(e) => {
        if (e.deltaY < 0) {
          userScrolledUpRef.current = true;
        }
      }}
      onTouchStart={() => {
        userScrolledUpRef.current = true;
      }}
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
      <ScrollToBottom visible={showScrollBtn} onClick={handleScrollToBottom} />
    </>
  );
}

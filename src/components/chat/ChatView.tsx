import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, MessageSquare, Brain, Copy, Download,
  ArrowLeft, Check, Wifi, WifiOff
} from 'lucide-react';
import ChatMessageBubble, { type ChatMessage } from './ChatMessageBubble';
import ChatInputBar from './ChatInputBar';
import ScrollToBottom from './ScrollToBottom';
import { askQuestion, processLectureByMode } from '../../services/api';

// ── Props ────────────────────────────────────────────────────────────────────

interface ChatViewProps {
  lectureId: string | null;
  fileName: string;
  accessToken: string;
  streamingSummary: string;
  isStreaming: boolean;
  isComplete: boolean;
  isConnected: boolean;
  streamError: string | null;
  triggerStream: () => Promise<void>;
  onReset: () => void;
  onStreamReady?: (lectureId: string, fileName: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

let msgId = 0;
const nextId = () => `msg-${++msgId}-${Date.now()}`;

const isNearBottom = (el: HTMLElement, threshold = 100) =>
  el.scrollHeight - el.scrollTop - el.clientHeight < threshold;

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatView({
  lectureId,
  fileName,
  accessToken,
  streamingSummary,
  isStreaming,
  isComplete,
  isConnected,
  streamError,
  triggerStream,
  onReset,
  onStreamReady,
}: ChatViewProps) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [copied, setCopied] = useState(false);
  const aiMsgIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // ── Initialize messages on mount ───────────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      type: 'file_upload',
      content: '',
      fileName,
      timestamp: new Date(),
    };

    const aiId = nextId();
    aiMsgIdRef.current = aiId;

    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      type: 'summary_stream',
      content: streamingSummary || '',
      isStreaming: isStreaming || (!isComplete && !streamError),
      timestamp: new Date(),
    };

    setMessages([userMsg, aiMsg]);
  }, []);

  // ── Update AI message as streaming progresses ──────────────────────────────

  useEffect(() => {
    if (!aiMsgIdRef.current) return;
    setMessages(prev =>
      prev.map(m =>
        m.id === aiMsgIdRef.current
          ? { ...m, content: streamingSummary, isStreaming, type: 'summary_stream' as const }
          : m
      )
    );
  }, [streamingSummary, isStreaming]);

  // ── Handle stream error ────────────────────────────────────────────────────

  useEffect(() => {
    if (streamError && aiMsgIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgIdRef.current
            ? { ...m, content: streamError, type: 'error' as const, isStreaming: false }
            : m
        )
      );
    }
  }, [streamError]);

  // ── Smart scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (scrollRef.current && (isStreaming || isAnswering)) {
      if (!userScrolledUpRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [streamingSummary, isStreaming, messages, isAnswering]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrolledUp = !isNearBottom(scrollRef.current);
    userScrolledUpRef.current = scrolledUp;
    setShowScrollBtn(scrolledUp);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    userScrolledUpRef.current = false;
    setShowScrollBtn(false);
  }, []);

  // ── Follow-up question handler ─────────────────────────────────────────────

  const handleSendMessage = useCallback(async (text: string) => {
    if (!lectureId || isAnswering) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date(),
    };

    const aiId = nextId();
    const aiMsg: ChatMessage = {
      id: aiId,
      role: 'assistant',
      type: 'text',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsAnswering(true);
    userScrolledUpRef.current = false;

    try {
      const res = await askQuestion(lectureId, text, accessToken);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? {
                ...m,
                content: res.answer,
                isStreaming: false,
                sourceChunks: res.sourceChunks,
                chunksUsed: res.chunksUsed,
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: err.message || 'Failed to get answer.', type: 'error' as const, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsAnswering(false);
    }
  }, [lectureId, accessToken, isAnswering]);

  // ── New file upload handler ────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (file: File) => {
    if (!onStreamReady) return;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      type: 'file_upload',
      content: '',
      fileName: file.name,
      fileSize: file.size,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const data = await processLectureByMode(file, 'chat', accessToken);
      onStreamReady(data.lectureId, data.fileName || file.name);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        type: 'error',
        content: err.message || 'Upload failed.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    }
  }, [accessToken, onStreamReady]);

  // ── Copy / Download ────────────────────────────────────────────────────────

  const handleCopy = async () => {
    await navigator.clipboard.writeText(streamingSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([streamingSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-10rem)] rounded-2xl border border-border overflow-hidden"
      style={{ background: 'var(--gradient-glass)', backdropFilter: 'blur(16px)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onReset}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--gradient-brand)' }}>
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{fileName}</p>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[11px] ${isConnected ? 'text-green-500' : 'text-muted-foreground'}`}>
                {isConnected ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Connecting…</>}
              </span>
              {isStreaming && (
                <span className="text-[11px] text-primary font-medium">Streaming...</span>
              )}
              {isComplete && (
                <span className="text-[11px] text-green-500 font-medium">Complete</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isComplete && streamingSummary && (
            <>
              <button onClick={handleCopy}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Copy">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={handleDownload}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Download .md">
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-5 relative"
      >
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Typing indicator for Q&A */}
        {isAnswering && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-primary-foreground"
              style={{ background: 'var(--gradient-brand)' }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="progress-dots">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}

        {/* Post-completion action buttons */}
        {isComplete && !isAnswering && messages.length <= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-2 pl-11"
          >
            {lectureId && (
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/lecture/${lectureId}?tab=chat`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground transition-all"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> Ask Questions
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/lecture/${lectureId}?tab=quiz`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
                  style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
                >
                  <Brain className="w-3.5 h-3.5" /> Take Quiz
                </motion.button>
              </>
            )}
          </motion.div>
        )}

        <ScrollToBottom visible={showScrollBtn} onClick={scrollToBottom} />
      </div>

      {/* ── Input bar ── */}
      <ChatInputBar
        onSendMessage={handleSendMessage}
        onFileSelect={handleFileSelect}
        disabled={!isComplete && !isStreaming && !streamError}
        isStreaming={isStreaming}
        isAnswering={isAnswering}
        hasLecture={!!lectureId && isComplete}
      />
    </motion.div>
  );
}

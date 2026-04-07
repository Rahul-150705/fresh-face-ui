import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles, FileText, ChevronDown, ChevronUp,
  Copy, Check, Loader2, RotateCcw,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: 'file_upload' | 'text' | 'summary_stream' | 'error';
  content: string;
  fileName?: string;
  pageCount?: number;
  fileSize?: number;
  lectureId?: string;
  isStreaming?: boolean;
  isUploading?: boolean;
  sourceChunks?: string[];
  chunksUsed?: number;
  timestamp: Date;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const [showChunks, setShowChunks] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isUser = message.role === 'user';
  const isError = message.type === 'error';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── User message ──
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end gap-2"
      >
        <div className="max-w-[75%] sm:max-w-[65%]">
          {message.type === 'file_upload' ? (
            <div className={`rounded-2xl px-4 py-3 border transition-all ${
              message.isUploading 
                ? 'bg-primary/5 border-primary/20 animate-pulse' 
                : 'bg-muted border-border'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                  {message.isUploading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">
                    {message.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {message.isUploading ? (
                      'Processing…'
                    ) : (
                      <>
                        {message.pageCount && `${message.pageCount} pages`}
                        {message.fileSize && ` · ${(message.fileSize / 1024 / 1024).toFixed(1)} MB`}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
              {message.content}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1 text-right px-1">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </motion.div>
    );
  }

  // ── AI message ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex gap-3 items-start"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-none">
        {/* Label */}
        <p className="text-xs font-semibold text-foreground mb-1.5">LearnAI</p>

        {isError ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">
            {message.content}
          </div>
        ) : (
          <>
            {message.content && (
              <div className="prose-chat">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle rounded-full"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </>
        )}

        {/* Streaming indicator */}
        {message.isStreaming && message.type === 'summary_stream' && (
          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <div className="progress-dots">
              <span /><span /><span />
            </div>
            <span>{message.content.length.toLocaleString()} chars</span>
          </div>
        )}

        {/* Source chunks */}
        {message.sourceChunks && message.sourceChunks.length > 0 && !message.isStreaming && (
          <div className="mt-3">
            <button
              onClick={() => setShowChunks(!showChunks)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {showChunks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Sources
              {message.chunksUsed && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold">
                  {message.chunksUsed}
                </span>
              )}
            </button>
            {showChunks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 space-y-2"
              >
                {message.sourceChunks.map((chunk, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg p-3 leading-relaxed">
                    <span className="text-[10px] font-bold text-foreground/50 mr-1.5">#{i + 1}</span>
                    {chunk}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Action bar */}
        {message.content && !message.isStreaming && !isError && (
          <div className={`flex items-center gap-0.5 mt-2 transition-all duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Timestamp */}
        {!message.isStreaming && (
          <p className="text-[10px] text-muted-foreground mt-1 px-0.5">
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
    </motion.div>
  );
}

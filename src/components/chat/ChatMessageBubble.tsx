import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles, FileText, ChevronDown, ChevronUp,
  Copy, Check,
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
  sourceChunks?: string[];
  chunksUsed?: number;
  timestamp: Date;
}

interface ChatMessageBubbleProps {
  message: ChatMessage;
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
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[70%]">
          {message.type === 'file_upload' ? (
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{message.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {message.pageCount && `${message.pageCount} pages`}
                    {message.fileSize && ` · ${(message.fileSize / 1024 / 1024).toFixed(1)} MB`}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-foreground leading-relaxed">
              {message.content}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── AI message ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-3 items-start"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* AI avatar */}
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-primary text-primary-foreground">
        <Sparkles className="w-3.5 h-3.5" />
      </div>

      {/* Content — no card, no border, no background */}
      <div className="flex-1 min-w-0">
        {isError ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl px-4 py-3 text-sm">
            {message.content}
          </div>
        ) : (
          <>
            {/* Markdown content */}
            {message.content && (
              <div className="prose-chat max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Blinking cursor while streaming */}
            {message.isStreaming && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-foreground ml-0.5 align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )}
          </>
        )}

        {/* Streaming status bar */}
        {message.isStreaming && message.type === 'summary_stream' && (
          <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
            <div className="progress-dots">
              <span /><span /><span />
            </div>
            <span>{message.content.length.toLocaleString()} chars</span>
          </div>
        )}

        {/* Source chunks accordion */}
        {message.sourceChunks && message.sourceChunks.length > 0 && !message.isStreaming && (
          <div className="mt-3">
            <button
              onClick={() => setShowChunks(!showChunks)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg"
            >
              {showChunks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              View Source Chunks
              {message.chunksUsed && (
                <span className="px-1.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold">
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
                  <div key={i} className="text-xs text-muted-foreground bg-muted border border-border rounded-xl p-3 leading-relaxed">
                    <span className="text-[10px] font-bold text-foreground/60 mr-1">#{i + 1}</span>
                    {chunk}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Action bar — copy button, ChatGPT style */}
        {message.content && !message.isStreaming && !isError && (
          <div className={`flex items-center gap-1 mt-2 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

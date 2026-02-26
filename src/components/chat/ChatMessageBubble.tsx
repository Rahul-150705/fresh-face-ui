import { useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles, FileText, User, ChevronDown, ChevronUp,
  Copy, Check, Loader2
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

  const isUser = message.role === 'user';
  const isError = message.type === 'error';
  const time = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
        isUser
          ? 'bg-primary/15 text-primary'
          : 'text-primary-foreground'
      }`}
        style={!isUser ? { background: 'var(--gradient-brand)' } : undefined}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'} ${
        isUser ? 'max-w-[75%]' : 'max-w-[85%] sm:max-w-[80%]'
      }`}>
        {/* Message card */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isError
            ? 'bg-destructive/10 border border-destructive/20 text-destructive'
            : isUser
              ? 'bg-primary/10 border border-primary/20 text-foreground'
              : 'bg-card border border-border text-foreground'
        }`}
          style={!isUser && !isError ? { boxShadow: 'var(--shadow-card)' } : undefined}
        >
          {/* File upload message */}
          {message.type === 'file_upload' && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{message.fileName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {message.pageCount && `${message.pageCount} pages`}
                  {message.fileSize && ` · ${(message.fileSize / 1024 / 1024).toFixed(1)} MB`}
                </p>
              </div>
            </div>
          )}

          {/* Text / streaming content */}
          {(message.type === 'text' || message.type === 'summary_stream' || message.type === 'error') && (
            <>
              {message.role === 'assistant' && message.content ? (
                <div className="prose-dark prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <span>{message.content}</span>
              )}

              {/* Blinking cursor while streaming */}
              {message.isStreaming && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                />
              )}
            </>
          )}
        </div>

        {/* Streaming status bar */}
        {message.isStreaming && message.type === 'summary_stream' && (
          <div className="flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
            <div className="progress-dots">
              <span /><span /><span />
            </div>
            <span>{message.content.length.toLocaleString()} chars</span>
          </div>
        )}

        {/* Source chunks (for Q&A answers) */}
        {message.sourceChunks && message.sourceChunks.length > 0 && !message.isStreaming && (
          <div className="w-full mt-1">
            <button
              onClick={() => setShowChunks(!showChunks)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
            >
              {showChunks ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              View Source Chunks
              {message.chunksUsed && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {message.chunksUsed}
                </span>
              )}
            </button>
            {showChunks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 space-y-2 px-1"
              >
                {message.sourceChunks.map((chunk, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-muted/50 border border-border/50 rounded-xl p-3 leading-relaxed">
                    <span className="text-[10px] font-bold text-primary/60 mr-1">#{i + 1}</span>
                    {chunk}
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Footer: time + copy */}
        <div className={`flex items-center gap-2 px-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {message.role === 'assistant' && message.content && !message.isStreaming && (
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Send, Loader2, MessageSquare, ChevronDown, ChevronUp,
  Database, GraduationCap, FileText
} from 'lucide-react';
import { askQuestion, AskQuestionResponse } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceChunks?: string[];
  chunksUsed?: number;
  timestamp: Date;
}

export default function LectureDetailPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || !lectureId || !accessToken || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data: AskQuestionResponse = await askQuestion(lectureId, q, accessToken);

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sourceChunks: data.sourceChunks,
        chunksUsed: data.chunksUsed,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${e.message || 'Failed to get answer. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleChunks = (id: string) =>
    setExpandedChunks(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="shrink-0 bg-card/80 backdrop-blur-lg border-b border-border z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-bold text-foreground text-sm sm:text-base truncate">
              Ask Questions
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> Lecture: {lectureId}
            </p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {messages.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4 text-center"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
                <MessageSquare className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold font-display text-foreground">Ask anything about this lecture</h2>
              <p className="text-muted-foreground text-sm max-w-md">
                Your questions are answered using RAG — the AI retrieves relevant chunks from your lecture content before generating a response.
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] sm:max-w-[75%] ${
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-br-md px-4 py-3 text-primary-foreground text-sm'
                    : 'bg-card rounded-2xl rounded-bl-md border border-border px-5 py-4'
                }`}
                  style={msg.role === 'user' ? { background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' } : { boxShadow: 'var(--shadow-card)' }}
                >
                  {msg.role === 'assistant' ? (
                    <div className="space-y-3">
                      <div className="prose prose-sm prose-headings:font-display prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground prose-a:text-primary max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>

                      {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                        <div className="border-t border-border pt-3 mt-3">
                          <button
                            onClick={() => toggleChunks(msg.id)}
                            className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Database className="w-3.5 h-3.5" />
                            View Source Chunks
                            {msg.chunksUsed != null && (
                              <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                {msg.chunksUsed}
                              </span>
                            )}
                            {expandedChunks[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <AnimatePresence>
                            {expandedChunks[msg.id] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                  {msg.sourceChunks.map((chunk, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground leading-relaxed">
                                      <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider">Chunk {i + 1}</span>
                                      <p className="mt-1 whitespace-pre-wrap">{chunk}</p>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-card rounded-2xl rounded-bl-md border border-border px-5 py-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Thinking…</span>
                </div>
                <div className="progress-dots mt-2">
                  <span /><span /><span />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about this lecture…"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 text-sm"
              autoFocus
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground transition-all disabled:opacity-40"
              style={{ background: loading || !input.trim() ? 'hsl(var(--primary) / 0.5)' : 'var(--gradient-brand)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
            Responses use RAG to retrieve relevant lecture content. May take 10-30s.
          </p>
        </div>
      </div>
    </div>
  );
}

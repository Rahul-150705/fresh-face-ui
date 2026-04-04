import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Send, Loader2, MessageSquare, ChevronDown, ChevronUp,
  Database, GraduationCap, FileText, RefreshCw, BookOpen, Brain,
  Target, BookMarked, AlertTriangle, CheckCircle2,
  Check, X, RotateCcw, Trophy, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { getLecture, reindexLecture, generateQuiz, submitQuizAnswers } from '../services/api';
import { Progress } from '@/components/ui/progress';
import SummaryView from '../components/SummaryView';
import { useQaStream } from '../hooks/useQaStream';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  index: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizData {
  lectureId: string;
  lectureTitle: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

interface QuizResult {
  index: number;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
}

interface QuizResults {
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  results: QuizResult[];
}

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LectureDetailPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [searchParams] = useSearchParams();

  const initialTab =
    (['summary', 'chat', 'quiz'] as const).find(t => t === searchParams.get('tab')) ?? 'summary';
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz'>(initialTab);

  // ── Summary state ──────────────────────────────────────────────────────────
  const [lecture, setLecture] = useState<any>(null);
  const [lectureLoading, setLectureLoading] = useState(true);
  const [lectureError, setLectureError] = useState('');
  const [reindexing, setReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Streaming Q&A hook ─────────────────────────────────────────────────────
  const {
    messages,
    isStreaming: qaStreaming,
    isConnected: qaConnected,
    error: qaError,
    askQuestion,
    clearMessages,
  } = useQaStream(lectureId, accessToken);

  // ── Chat input state ───────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Quiz state ─────────────────────────────────────────────────────────────
  const [quizPhase, setQuizPhase] = useState<'idle' | 'generating' | 'quiz' | 'submitting' | 'results'>('idle');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // ── Fetch lecture on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!lectureId || !accessToken) return;
    setLectureLoading(true);
    getLecture(lectureId, accessToken)
      .then(d => { setLecture(d); setLectureError(''); })
      .catch(e => setLectureError(e.message))
      .finally(() => setLectureLoading(false));
  }, [lectureId, accessToken]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Chat send ──────────────────────────────────────────────────────────────
  const handleSend = () => {
    const q = input.trim();
    if (!q || qaStreaming) return;
    setInput('');
    askQuestion(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Reindex ────────────────────────────────────────────────────────────────
  const handleReindex = () => {
    if (reindexing) return;
    fileInputRef.current?.click();
  };

  const handleReindexFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !lectureId || !accessToken) return;
    setReindexing(true);
    try {
      await reindexLecture(lectureId, file, accessToken);
      setReindexSuccess(true);
      setTimeout(() => setReindexSuccess(false), 5000);
    } catch { }
    finally {
      setReindexing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Quiz helpers ───────────────────────────────────────────────────────────
  const startQuiz = async () => {
    if (!lectureId || !accessToken) return;
    setQuizPhase('generating');
    setQuizError(null);
    try {
      const data = await generateQuiz(lectureId, accessToken);
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentQ(0);
      setQuizResults(null);
      setReviewOpen(false);
      setQuizPhase('quiz');
    } catch (e: any) {
      setQuizError(e.message || 'Failed to generate quiz');
      setQuizPhase('idle');
    }
  };

  const submitQuiz = async () => {
    if (!quiz || !lectureId || !accessToken) return;
    setQuizPhase('submitting');
    setQuizError(null);
    try {
      const data = await submitQuizAnswers(lectureId, answers as string[], accessToken);
      setQuizResults(data);
      setQuizPhase('results');
    } catch (e: any) {
      setQuizError(e.message || 'Failed to submit quiz');
      setQuizPhase('quiz');
    }
  };

  const tabs = [
    { key: 'summary' as const, label: 'Summary', icon: BookMarked },
    { key: 'chat' as const, label: 'Ask Questions', icon: MessageSquare },
    { key: 'quiz' as const, label: 'Quiz', icon: Brain },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]"
          style={{ background: 'hsl(263 70% 50%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]"
          style={{ background: 'hsl(217 91% 60%)' }} />
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleReindexFile} />

      {/* Header */}
      <header className="shrink-0 glass-card border-b border-border/50 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-brand)' }}>
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-foreground text-sm sm:text-base truncate">
              {lecture?.title || lecture?.fileName || 'Lecture'}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" /> {lectureId}
            </p>
          </div>
          {activeTab === 'summary' && (
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} /> Re-index
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 border-t border-border/30 pt-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/[0.05]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Banners */}
      <AnimatePresence>
        {reindexSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-[hsl(var(--color-success))]/10 border-b border-[hsl(var(--color-success))]/20 px-4 py-2 text-sm text-center font-medium"
            style={{ color: 'hsl(var(--color-success))' }}>
            <CheckCircle2 className="w-4 h-4 inline mr-2" />
            Lecture re-indexed successfully. Q&amp;A is now updated.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ TAB CONTENT ════════ */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              {lectureLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : lectureError ? (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-5 h-5" /> {lectureError}
                </div>
              ) : lecture && !lecture.overview && !lecture.keyPoints?.length && !lecture.title ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}>
                    <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-foreground">AI Summary is generating…</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      The PDF was indexed for Q&amp;A. The full summary is being generated in the background.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setLectureLoading(true);
                      getLecture(lectureId!, accessToken!)
                        .then(d => { setLecture(d); setLectureError(''); })
                        .catch(e => setLectureError(e.message))
                        .finally(() => setLectureLoading(false));
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <RefreshCw className="w-4 h-4" /> Refresh Summary
                  </button>
                </motion.div>
              ) : lecture ? (
                <SummaryView
                  summary={{
                    lectureId: lecture.id,
                    title: lecture.title || lecture.fileName,
                    overview: lecture.overview,
                    keyPoints: lecture.keyPoints,
                    definitions: lecture.definitions,
                    detailedExplanation: lecture.detailedExplanation,
                    examPoints: lecture.examPoints,
                    furtherReading: lecture.furtherReading,
                    fileName: lecture.fileName,
                    provider: lecture.provider,
                    generatedAt: lecture.processedAt,
                    pageCount: lecture.pageCount,
                  }}
                  onReset={() => navigate('/dashboard')}
                  onAskQuestions={() => setActiveTab('chat')}
                  onTakeQuiz={() => setActiveTab('quiz')}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">

                {/* Empty state */}
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}>
                      <MessageSquare className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Ask anything about this lecture</h2>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Answers stream live — the AI retrieves relevant sections from your lecture using RAG,
                      then generates a response token by token.
                    </p>
                    {/* Suggestion chips */}
                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                      {[
                        'Summarize the main idea',
                        'What are the key concepts?',
                        'Explain the most important point',
                      ].map(q => (
                        <button
                          key={q}
                          onClick={() => { setInput(q); inputRef.current?.focus(); }}
                          className="px-3 py-1.5 text-xs font-medium rounded-full border border-border bg-muted/50 hover:bg-muted text-foreground transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Error banner */}
                {qaError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {qaError}
                  </div>
                )}

                {/* Messages */}
                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] ${msg.role === 'user'
                          ? 'rounded-2xl rounded-br-md px-4 py-3 text-primary-foreground text-sm'
                          : 'glass-card rounded-2xl rounded-bl-md px-5 py-4'
                          }`}
                        style={
                          msg.role === 'user'
                            ? { background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }
                            : undefined
                        }>

                        {msg.role === 'assistant' ? (
                          <div className="space-y-3">
                            {/* Show pulsing dots while content is empty and streaming */}
                            {msg.isStreaming && msg.content === '' ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span>Searching lecture content…</span>
                              </div>
                            ) : (
                              <div className="prose prose-sm prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground prose-a:text-primary max-w-none text-sm">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                {/* Blinking cursor while streaming */}
                                {msg.isStreaming && (
                                  <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                                )}
                              </div>
                            )}

                            {/* Source chunks — shown after streaming completes */}
                            {!msg.isStreaming && msg.sourceChunks && msg.sourceChunks.length > 0 && (
                              <div className="border-t border-border/50 pt-3 mt-3">
                                <button
                                  onClick={() =>
                                    setExpandedChunks(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                                  }
                                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                  <Database className="w-3.5 h-3.5" />
                                  View Source Chunks
                                  {msg.chunksUsed != null && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                      {msg.chunksUsed}
                                    </span>
                                  )}
                                  {expandedChunks[msg.id] ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <AnimatePresence>
                                  {expandedChunks[msg.id] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden">
                                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                        {msg.sourceChunks.map((chunk, i) => (
                                          <div
                                            key={i}
                                            className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground leading-relaxed">
                                            <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider">
                                              Chunk {i + 1}
                                            </span>
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

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat input bar */}
            <div className="shrink-0 border-t border-border/50 glass-card">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this lecture…"
                    disabled={qaStreaming}
                    className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleSend}
                    disabled={qaStreaming || !input.trim()}
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground transition-all disabled:opacity-40"
                    style={{
                      background:
                        qaStreaming || !input.trim()
                          ? 'hsl(var(--primary) / 0.5)'
                          : 'var(--gradient-brand)',
                    }}>
                    {qaStreaming ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    Answers stream live using RAG + Ollama. May take 10–30s.
                  </p>
                  <div className="flex items-center gap-1.5">
                    {qaConnected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                        <Wifi className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <WifiOff className="w-3 h-3" /> Connecting…
                      </span>
                    )}
                    {messages.length > 0 && (
                      <button
                        onClick={clearMessages}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-2">
                        Clear chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── QUIZ TAB ── */}
        {activeTab === 'quiz' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

              {/* Idle */}
              {quizPhase === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}>
                    <Brain className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Test Your Knowledge</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Generate a 10-question quiz based on this lecture to see how well you understand the material.
                  </p>
                  {quizError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{quizError}</div>
                  )}
                  <button
                    onClick={startQuiz}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                    <Brain className="w-5 h-5" /> Generate Quiz
                  </button>
                </motion.div>
              )}

              {/* Generating */}
              {quizPhase === 'generating' && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)' }}>
                    <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-semibold text-foreground">Generating quiz… ⏳</p>
                    <p className="text-sm text-muted-foreground">Creating questions from your lecture content</p>
                  </div>
                </motion.div>
              )}

              {/* Quiz questions */}
              {(quizPhase === 'quiz' || quizPhase === 'submitting') && quiz && (() => {
                const q = quiz.questions[currentQ];
                const isLast = currentQ === quiz.questions.length - 1;
                const allAnswered = answers.every(a => a !== null);
                const progressPct = ((currentQ + 1) / quiz.questions.length) * 100;

                return (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        <span className="font-bold text-foreground">Quiz</span>
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        Question {currentQ + 1} of {quiz.questions.length}
                      </span>
                    </div>

                    <Progress value={progressPct} className="h-2" />

                    {quizError && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{quizError}</div>
                    )}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentQ}
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.25 }}
                        className="glass-card p-6 space-y-5">
                        <p className="text-lg font-semibold text-foreground leading-relaxed">{q.question}</p>
                        <div className="grid gap-3">
                          {q.options.map((opt: string, i: number) => {
                            const label = ANSWER_LABELS[i];
                            const selected = answers[currentQ] === label;
                            return (
                              <button
                                key={label}
                                onClick={() => {
                                  const copy = [...answers];
                                  copy[currentQ] = label;
                                  setAnswers(copy);
                                }}
                                disabled={quizPhase === 'submitting'}
                                className={`w-full text-left flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${selected
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                  : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                  }`}>
                                <span
                                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${selected ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    }`}
                                  style={selected ? { background: 'var(--gradient-brand)' } : undefined}>
                                  {label}
                                </span>
                                <span className="text-sm text-foreground">{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                        disabled={currentQ === 0}
                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40">
                        Previous
                      </button>
                      {isLast ? (
                        <button
                          onClick={submitQuiz}
                          disabled={!allAnswered || quizPhase === 'submitting'}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
                          style={{ background: 'var(--gradient-brand)' }}>
                          {quizPhase === 'submitting' ? (
                            <><span className="btn-spinner" /> Submitting…</>
                          ) : (
                            <><Send className="w-4 h-4" /> Submit Quiz</>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentQ(p => p + 1)}
                          disabled={answers[currentQ] === null}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
                          style={{ background: 'var(--gradient-brand)' }}>
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {quiz.questions.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setCurrentQ(i)}
                          className={`w-3 h-3 rounded-full transition-colors ${i === currentQ ? 'bg-primary scale-125' : answers[i] ? 'bg-primary/40' : 'bg-muted'
                            }`}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Results */}
              {quizPhase === 'results' && quizResults && (() => {
                const pctColor =
                  quizResults.percentage >= 80
                    ? 'hsl(var(--color-success))'
                    : quizResults.percentage >= 50
                      ? 'hsl(var(--color-warning))'
                      : 'hsl(var(--destructive))';

                return (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="glass-card p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                        style={{ background: pctColor + '22' }}>
                        <Trophy className="w-8 h-8" style={{ color: pctColor }} />
                      </div>
                      <h2 className="text-3xl font-extrabold text-foreground">
                        {quizResults.score} / {quizResults.totalQuestions}
                      </h2>
                      <div className="w-full max-w-xs mx-auto">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${quizResults.percentage}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: pctColor }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{quizResults.percentage}%</p>
                      </div>
                      <span
                        className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: pctColor + '18', color: pctColor }}>
                        {quizResults.grade}
                      </span>
                    </div>

                    <button
                      onClick={() => setReviewOpen(p => !p)}
                      className="w-full flex items-center justify-between px-5 py-3 rounded-xl glass-card text-sm font-semibold text-foreground hover:bg-primary/[0.03] transition-colors">
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Review Answers
                      </span>
                      {reviewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {reviewOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4">
                          {quizResults.results.map((r, i) => (
                            <div
                              key={i}
                              className={`rounded-xl border-2 p-5 space-y-3 ${r.correct
                                ? 'border-[hsl(var(--color-success))]/40 bg-[hsl(var(--color-success))]/5'
                                : 'border-destructive/40 bg-destructive/5'
                                }`}>
                              <div className="flex items-start gap-2">
                                {r.correct ? (
                                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--color-success))' }} />
                                ) : (
                                  <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                )}
                                <p className="font-medium text-foreground text-sm">Q{i + 1}. {r.question}</p>
                              </div>
                              <div className="ml-7 space-y-1 text-sm">
                                <p>
                                  <span className="text-muted-foreground">Your answer: </span>
                                  <span className={r.correct ? '' : 'text-destructive font-medium'}>
                                    {r.selectedAnswer}
                                  </span>
                                </p>
                                {!r.correct && (
                                  <p>
                                    <span className="text-muted-foreground">Correct: </span>
                                    <span className="font-medium" style={{ color: 'hsl(var(--color-success))' }}>
                                      {r.correctAnswer}
                                    </span>
                                  </p>
                                )}
                                <p className="text-muted-foreground mt-2 flex items-start gap-1.5">
                                  <Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  {r.explanation}
                                </p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 justify-center">
                      <button
                        onClick={() => { setQuizPhase('idle'); startQuiz(); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity"
                        style={{ background: 'var(--gradient-brand)' }}>
                        <RotateCcw className="w-4 h-4" /> Retake Quiz
                      </button>
                      <button
                        onClick={() => setActiveTab('summary')}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Summary
                      </button>
                    </div>
                  </motion.div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
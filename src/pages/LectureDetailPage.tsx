import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Send, Loader2, MessageSquare, ChevronDown, ChevronUp,
  Database, GraduationCap, FileText, RefreshCw, BookOpen, Brain,
  Lightbulb, Target, BookMarked, ExternalLink, AlertTriangle, CheckCircle2,
  BookA, ScrollText, Check, X, RotateCcw, Trophy, ChevronRight
} from 'lucide-react';
import { askQuestion, AskQuestionResponse, getLecture, reindexLecture, generateQuiz, submitQuizAnswers } from '../services/api';
import { Progress } from '@/components/ui/progress';

// ── Types ──

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceChunks?: string[];
  chunksUsed?: number;
  timestamp: Date;
}

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

export default function LectureDetailPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz'>('summary');

  // ── Summary state ──
  const [lecture, setLecture] = useState<any>(null);
  const [lectureLoading, setLectureLoading] = useState(true);
  const [lectureError, setLectureError] = useState('');
  const [reindexing, setReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true, keyPoints: true, definitions: true, detailed: false, examPoints: true, furtherReading: true
  });

  // ── Chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Quiz state ──
  const [quizPhase, setQuizPhase] = useState<'idle' | 'generating' | 'quiz' | 'submitting' | 'results'>('idle');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(string | null)[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResults | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // ── Fetch lecture on mount ──
  useEffect(() => {
    if (!lectureId || !accessToken) return;
    setLectureLoading(true);
    getLecture(lectureId, accessToken)
      .then(d => { setLecture(d); setLectureError(''); })
      .catch(e => setLectureError(e.message))
      .finally(() => setLectureLoading(false));
  }, [lectureId, accessToken]);

  // ── Chat helpers ──
  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || !lectureId || !accessToken || chatLoading) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setChatLoading(true);
    try {
      const data: AskQuestionResponse = await askQuestion(lectureId, q, accessToken);
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`, role: 'assistant', content: data.answer,
        sourceChunks: data.sourceChunks, chunksUsed: data.chunksUsed, timestamp: new Date()
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant', content: `⚠️ ${e.message || 'Failed to get answer.'}`, timestamp: new Date()
      }]);
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Reindex ──
  const handleReindex = async () => {
    if (!lectureId || !accessToken || reindexing) return;
    setReindexing(true);
    setReindexSuccess(false);
    try {
      await reindexLecture(lectureId, accessToken);
      setReindexSuccess(true);
      setTimeout(() => setReindexSuccess(false), 5000);
    } catch {}
    finally { setReindexing(false); }
  };

  // ── Quiz helpers ──
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

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const tabs = [
    { key: 'summary' as const, label: 'Summary', icon: BookMarked },
    { key: 'chat' as const, label: 'Ask Questions', icon: MessageSquare },
    { key: 'quiz' as const, label: 'Quiz', icon: Brain },
  ];

  // ── Section Card ──
  const SectionCard = ({ sectionKey, icon: Icon, label, children }: {
    sectionKey: string; icon: any; label: string; children: React.ReactNode;
  }) => {
    const isOpen = expandedSections[sectionKey];
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden">
        <button onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-border/50 text-left transition-colors hover:bg-primary/[0.03]">
          <Icon className="w-5 h-5 shrink-0 text-primary" />
          <span className="font-semibold flex-1 text-foreground">{label}</span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-5">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]" style={{ background: 'hsl(263 70% 50%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]" style={{ background: 'hsl(217 91% 60%)' }} />
      </div>

      {/* Header */}
      <header className="shrink-0 glass-card border-b border-border/50 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
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
            <button onClick={handleReindex} disabled={reindexing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} /> Re-index
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 border-t border-border/30 pt-1">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-[hsl(var(--color-success))]/10 border-b border-[hsl(var(--color-success))]/20 px-4 py-2 text-sm text-center font-medium"
            style={{ color: 'hsl(var(--color-success))' }}>
            <CheckCircle2 className="w-4 h-4 inline mr-2" /> Lecture re-indexed successfully. Q&A is now updated.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════ TAB CONTENT ════════ */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
              {lectureLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : lectureError ? (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-5 h-5" /> {lectureError}
                </div>
              ) : lecture ? (
                <>
                  {/* Title & metadata */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-extrabold text-foreground mb-3">{lecture.title}</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lecture.fileName && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          <FileText className="w-3 h-3" /> {lecture.fileName}
                        </span>
                      )}
                      {lecture.provider && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                          <GraduationCap className="w-3 h-3" /> {lecture.provider}
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {lecture.overview && (
                    <SectionCard sectionKey="overview" icon={ScrollText} label="Overview">
                      <p className="text-sm text-card-foreground leading-relaxed">{lecture.overview}</p>
                    </SectionCard>
                  )}

                  {lecture.keyPoints?.length > 0 && (
                    <SectionCard sectionKey="keyPoints" icon={Lightbulb} label="Key Points">
                      <ul className="space-y-3">
                        {lecture.keyPoints.map((kp: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5" style={{ background: 'var(--gradient-brand)' }}>
                              {i + 1}
                            </span>
                            <span className="text-sm text-card-foreground leading-relaxed">{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {lecture.definitions?.length > 0 && (
                    <SectionCard sectionKey="definitions" icon={BookA} label="Definitions">
                      <ul className="space-y-3">
                        {lecture.definitions.map((d: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                            <span className="text-sm text-card-foreground leading-relaxed">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {lecture.detailedExplanation && (
                    <SectionCard sectionKey="detailed" icon={BookOpen} label="Detailed Explanation">
                      <div className="prose prose-sm prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground prose-a:text-primary max-w-none text-sm">
                        <ReactMarkdown>{lecture.detailedExplanation}</ReactMarkdown>
                      </div>
                    </SectionCard>
                  )}

                  {lecture.examPoints?.length > 0 && (
                    <SectionCard sectionKey="examPoints" icon={Target} label="Exam Points">
                      <div className="grid gap-3">
                        {lecture.examPoints.map((ep: string, i: number) => (
                          <div key={i} className="p-3 rounded-lg border border-[hsl(var(--color-warning))]/20 bg-[hsl(var(--color-warning))]/5 text-sm text-card-foreground">
                            <span className="font-semibold" style={{ color: 'hsl(var(--color-warning))' }}>#{i + 1}</span> {ep}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {lecture.furtherReading?.length > 0 && (
                    <SectionCard sectionKey="furtherReading" icon={ExternalLink} label="Further Reading">
                      <div className="flex flex-wrap gap-2">
                        {lecture.furtherReading.map((fr: string, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                            <ExternalLink className="w-3 h-3" /> {fr}
                          </span>
                        ))}
                      </div>
                    </SectionCard>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* ── CHAT TAB ── */}
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                {messages.length === 0 && !chatLoading && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}>
                      <MessageSquare className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Ask anything about this lecture</h2>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Your questions are answered using RAG — the AI retrieves relevant chunks from your lecture before generating a response.
                    </p>
                  </motion.div>
                )}

                <AnimatePresence initial={false}>
                  {messages.map(msg => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] ${
                        msg.role === 'user'
                          ? 'rounded-2xl rounded-br-md px-4 py-3 text-primary-foreground text-sm'
                          : 'glass-card rounded-2xl rounded-bl-md px-5 py-4'
                      }`}
                        style={msg.role === 'user' ? { background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' } : undefined}>
                        {msg.role === 'assistant' ? (
                          <div className="space-y-3">
                            <div className="prose prose-sm prose-headings:text-foreground prose-p:text-card-foreground prose-li:text-card-foreground prose-strong:text-foreground prose-a:text-primary max-w-none text-sm">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                              <div className="border-t border-border/50 pt-3 mt-3">
                                <button onClick={() => setExpandedChunks(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                                  <Database className="w-3.5 h-3.5" /> View Source Chunks
                                  {msg.chunksUsed != null && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{msg.chunksUsed}</span>
                                  )}
                                  {expandedChunks[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <AnimatePresence>
                                  {expandedChunks[msg.id] && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                                        {msg.sourceChunks.map((chunk, i) => (
                                          <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground leading-relaxed">
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

                {chatLoading && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                    <div className="glass-card rounded-2xl rounded-bl-md px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Thinking…
                      </div>
                      <div className="progress-dots mt-2"><span /><span /><span /></div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Chat input bar */}
            <div className="shrink-0 border-t border-border/50 glass-card">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3">
                <div className="flex items-center gap-3">
                  <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                    placeholder="Ask a question about this lecture…" disabled={chatLoading}
                    className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50 text-sm"
                    autoFocus />
                  <button onClick={handleSend} disabled={chatLoading || !input.trim()}
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground transition-all disabled:opacity-40"
                    style={{ background: chatLoading || !input.trim() ? 'hsl(var(--primary) / 0.5)' : 'var(--gradient-brand)' }}>
                    {chatLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                  Responses use RAG to retrieve relevant lecture content. May take 10-30s.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── QUIZ TAB ── */}
        {activeTab === 'quiz' && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
              {/* Idle — generate button */}
              {quizPhase === 'idle' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 gap-6 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-glow)' }}>
                    <Brain className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Test Your Knowledge</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Generate a 10-question quiz based on this lecture to see how well you understand the material.
                  </p>
                  {quizError && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{quizError}</div>
                  )}
                  <button onClick={startQuiz}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-primary-foreground transition-all hover:shadow-lg"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                    <Brain className="w-5 h-5" /> Generate Quiz
                  </button>
                </motion.div>
              )}

              {/* Generating */}
              {quizPhase === 'generating' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
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
                      <span className="text-sm text-muted-foreground font-medium">Question {currentQ + 1} of {quiz.questions.length}</span>
                    </div>

                    <Progress value={progressPct} className="h-2" />

                    {quizError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{quizError}</div>}

                    <AnimatePresence mode="wait">
                      <motion.div key={currentQ} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
                        className="glass-card p-6 space-y-5">
                        <p className="text-lg font-semibold text-foreground leading-relaxed">{q.question}</p>
                        <div className="grid gap-3">
                          {q.options.map((opt: string, i: number) => {
                            const label = ANSWER_LABELS[i];
                            const selected = answers[currentQ] === label;
                            return (
                              <button key={label} onClick={() => { const copy = [...answers]; copy[currentQ] = label; setAnswers(copy); }}
                                disabled={quizPhase === 'submitting'}
                                className={`w-full text-left flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${
                                  selected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}>
                                <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                  selected ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'
                                }`} style={selected ? { background: 'var(--gradient-brand)' } : undefined}>
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
                      <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}
                        className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40">
                        Previous
                      </button>
                      {isLast ? (
                        <button onClick={submitQuiz} disabled={!allAnswered || quizPhase === 'submitting'}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
                          style={{ background: 'var(--gradient-brand)' }}>
                          {quizPhase === 'submitting' ? <><span className="btn-spinner" /> Submitting…</> : <><Send className="w-4 h-4" /> Submit Quiz</>}
                        </button>
                      ) : (
                        <button onClick={() => setCurrentQ(p => p + 1)} disabled={answers[currentQ] === null}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
                          style={{ background: 'var(--gradient-brand)' }}>
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {quiz.questions.map((_: any, i: number) => (
                        <button key={i} onClick={() => setCurrentQ(i)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            i === currentQ ? 'bg-primary scale-125' : answers[i] ? 'bg-primary/40' : 'bg-muted'
                          }`} />
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Results */}
              {quizPhase === 'results' && quizResults && (() => {
                const pctColor = quizResults.percentage >= 80
                  ? 'hsl(var(--color-success))' : quizResults.percentage >= 50
                  ? 'hsl(var(--color-warning))' : 'hsl(var(--destructive))';

                return (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="glass-card p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: pctColor + '22' }}>
                        <Trophy className="w-8 h-8" style={{ color: pctColor }} />
                      </div>
                      <h2 className="text-3xl font-extrabold text-foreground">{quizResults.score} / {quizResults.totalQuestions}</h2>
                      <div className="w-full max-w-xs mx-auto">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${quizResults.percentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                            className="h-full rounded-full" style={{ background: pctColor }} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{quizResults.percentage}%</p>
                      </div>
                      <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold" style={{ background: pctColor + '18', color: pctColor }}>
                        {quizResults.grade}
                      </span>
                    </div>

                    <button onClick={() => setReviewOpen(p => !p)}
                      className="w-full flex items-center justify-between px-5 py-3 rounded-xl glass-card text-sm font-semibold text-foreground hover:bg-primary/[0.03] transition-colors">
                      <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Review Answers</span>
                      {reviewOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <AnimatePresence>
                      {reviewOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                          {quizResults.results.map((r, i) => (
                            <div key={i} className={`rounded-xl border-2 p-5 space-y-3 ${
                              r.correct ? 'border-[hsl(var(--color-success))]/40 bg-[hsl(var(--color-success))]/5' : 'border-destructive/40 bg-destructive/5'
                            }`}>
                              <div className="flex items-start gap-2">
                                {r.correct ? <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(var(--color-success))' }} /> : <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
                                <p className="font-medium text-foreground text-sm">Q{i + 1}. {r.question}</p>
                              </div>
                              <div className="ml-7 space-y-1 text-sm">
                                <p><span className="text-muted-foreground">Your answer:</span> <span className={r.correct ? '' : 'text-destructive font-medium'}>{r.selectedAnswer}</span></p>
                                {!r.correct && <p><span className="text-muted-foreground">Correct:</span> <span className="font-medium" style={{ color: 'hsl(var(--color-success))' }}>{r.correctAnswer}</span></p>}
                                <p className="text-muted-foreground mt-2 flex items-start gap-1.5"><Target className="w-3.5 h-3.5 shrink-0 mt-0.5" />{r.explanation}</p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 justify-center">
                      <button onClick={() => { setQuizPhase('idle'); startQuiz(); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground transition-opacity"
                        style={{ background: 'var(--gradient-brand)' }}>
                        <RotateCcw className="w-4 h-4" /> Retake Quiz
                      </button>
                      <button onClick={() => setActiveTab('summary')}
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

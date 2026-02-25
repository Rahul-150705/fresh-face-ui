import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, LogOut, Bot, FileText, Clock, Trash2, ChevronRight,
  History, AlertCircle, Loader2, MessageSquare, Brain
} from 'lucide-react';
import UploadLecture from '../components/UploadLecture';
import SummaryView from '../components/SummaryView';
import QuizView from '../components/QuizView';
import LoadingAnimation from '../components/LoadingAnimation';
import { checkHealth, getLectureHistory, deleteLecture, LectureHistoryItem } from '../services/api';

export default function DashboardPage() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();

  const [appState, setAppState] = useState<'idle' | 'loading' | 'done' | 'quiz'>('idle');
  const [summary, setSummary] = useState<any>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const [history, setHistory] = useState<LectureHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    if (accessToken) {
      checkHealth().then(d => setProvider(d.provider)).catch(() => setProvider('openai'));
    }
  }, [accessToken]);

  const fetchHistory = useCallback(async () => {
    if (!accessToken) return;
    setHistoryLoading(true);
    setHistoryError('');
    try { setHistory(await getLectureHistory(accessToken)); }
    catch (e: any) { setHistoryError(e.message || 'Failed to load history'); }
    finally { setHistoryLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try { await deleteLecture(id, accessToken); setHistory(prev => prev.filter(h => h.id !== id)); } catch {}
  };

  const handleLoading = (v: boolean) => setAppState(v ? 'loading' : 'idle');
  const handleSummaryReady = (d: any) => { setSummary(d); setAppState('done'); fetchHistory(); };
  const handleReset = () => { setSummary(null); setAppState('idle'); };

  const providerLabel = (p: string | null) =>
    ({ openai: 'OpenAI GPT-4', claude: 'Anthropic Claude', gemini: 'Google Gemini', ollama: 'Ollama Local' } as Record<string, string>)[p?.toLowerCase() || ''] || p;

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]" style={{ background: 'hsl(263 70% 50%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]" style={{ background: 'hsl(217 91% 60%)' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground hidden sm:inline">AI Teaching Assistant</span>
          </div>
          <div className="flex items-center gap-3">
            {provider && (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                <Bot className="w-3.5 h-3.5" /> {providerLabel(provider)}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground" style={{ background: 'var(--gradient-brand)' }}>
                {user?.fullName?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">{user?.fullName}</span>
            </div>
            <button onClick={logout} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload + Summary area */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-2">
                {appState === 'idle' ? 'Upload & Summarize' : appState === 'quiz' ? 'Quiz Mode' : 'Summary'}
              </h1>
              <p className="text-muted-foreground text-lg">
                Upload your lecture PDF and get an AI-powered structured summary instantly
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {appState === 'idle' && (
                <UploadLecture key="upload" onSummaryReady={handleSummaryReady} onLoading={handleLoading} accessToken={accessToken!} />
              )}
              {appState === 'loading' && <LoadingAnimation key="loading" />}
              {appState === 'done' && summary && (
                <SummaryView
                  key="summary"
                  summary={summary}
                  onReset={handleReset}
                  onTakeQuiz={summary.lectureId ? () => setAppState('quiz') : undefined}
                  onAskQuestions={summary.lectureId ? () => navigate(`/lecture/${summary.lectureId}`) : undefined}
                />
              )}
              {appState === 'quiz' && summary?.lectureId && (
                <QuizView key="quiz" lectureId={summary.lectureId} lectureTitle={summary.title || 'Lecture'} accessToken={accessToken!} onBack={() => setAppState('done')} />
              )}
            </AnimatePresence>
          </div>

          {/* Right: Lecture History sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">Lecture History</h2>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : historyError ? (
                <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-lg bg-destructive/10">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {historyError}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No lectures yet. Upload your first PDF!</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {history.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/[0.03] transition-all cursor-pointer"
                      onClick={() => navigate(`/lecture/${item.id}`)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.fileName}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" /> {formatDate(item.processedAt)}
                          <span>· {item.pageCount}p</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border/50">
        AI Teaching Assistant · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap, LogOut, Bot, FileText, Clock, Trash2,
    AlertCircle, Loader2, MessageSquare, Brain, BarChart2,
    BookOpen, Layers, Star, Target, TrendingUp,
    Layers2, BookMarked, Download, Home, Library, Search,
    ChevronRight, X, CalendarDays
} from 'lucide-react';
import SmartUploadPanel from '../components/SmartUploadPanel';
import SummaryView from '../components/SummaryView';
import ChatView from '../components/chat/ChatView';
import QuizView from '../components/QuizView';
import LoadingAnimation from '../components/LoadingAnimation';
import FlashcardModal from '../components/FlashcardModal';
import { useSummaryStream } from '../hooks/useSummaryStream';
import {
    checkHealth, getLectureHistory, deleteLecture, getUserStats,
    LectureHistoryItem, UserStats
} from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function gradeColor(pct: number) {
    if (pct >= 80) return 'hsl(152 60% 42%)';
    if (pct >= 60) return 'hsl(38 92% 50%)';
    return 'hsl(0 72% 55%)';
}

function StatCard({ icon: Icon, label, value, sub, gradient }: {
    icon: React.FC<{ className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
    gradient?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={gradient
                        ? { background: 'var(--gradient-brand)' }
                        : { background: 'hsl(var(--primary) / 0.1)' }}>
                    <Icon className={`w-4 h-4 ${gradient ? 'text-primary-foreground' : 'text-primary'}`} />
                </div>
                {gradient && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-primary-foreground"
                        style={{ background: 'var(--gradient-brand)' }}>LIVE</span>
                )}
            </div>
            <div>
                <p className="text-2xl font-extrabold text-foreground">{value}</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </motion.div>
    );
}

function exportSummaryAsMd(summary: any) {
    const content = summary.markdownSummary || [
        `# ${summary.title || 'Lecture Summary'}`,
        summary.overview ? `## Overview\n${summary.overview}` : '',
        summary.keyPoints?.length
            ? `## Key Points\n${summary.keyPoints.map((k: string, i: number) => `${i + 1}. ${k}`).join('\n')}` : '',
        summary.definitions?.length
            ? `## Definitions\n${summary.definitions.map((d: string, i: number) => `${i + 1}. ${d}`).join('\n')}` : '',
        summary.examPoints?.length
            ? `## Exam Tips\n${summary.examPoints.map((e: string, i: number) => `${i + 1}. ${e}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(summary.title || 'summary').replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture card (used in My Lectures tab)
// ─────────────────────────────────────────────────────────────────────────────

function LectureCard({
    item, index, onDelete, navigate
}: {
    item: LectureHistoryItem;
    index: number;
    onDelete: (id: string) => void;
    navigate: (path: string) => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fmt = (iso: string) => {
        try {
            return new Date(iso).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
        } catch { return iso; }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            className="glass-card overflow-hidden group flex flex-col"
        >
            {/* Color accent bar */}
            <div className="h-1.5 w-full" style={{ background: 'var(--gradient-brand)' }} />

            <div className="p-5 flex flex-col gap-4 flex-1">
                {/* Title + date */}
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                            {item.fileName}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <CalendarDays className="w-3 h-3" /> {fmt(item.processedAt)}
                            </span>
                            {item.pageCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <BookOpen className="w-3 h-3" /> {item.pageCount} pages
                                </span>
                            )}
                            {item.provider && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    <Bot className="w-2.5 h-2.5" />
                                    {item.provider.charAt(0).toUpperCase() + item.provider.slice(1)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2 mt-auto">
                    <button
                        onClick={() => navigate(`/lecture/${item.id}`)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                        <BookMarked className="w-4 h-4" />
                        Summary
                    </button>
                    <button
                        onClick={() => navigate(`/lecture/${item.id}?tab=chat`)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Ask AI
                    </button>
                    <button
                        onClick={() => navigate(`/lecture/${item.id}?tab=quiz`)}
                        className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold text-primary-foreground transition-all hover:opacity-90"
                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}
                    >
                        <Brain className="w-4 h-4" />
                        Quiz
                    </button>
                </div>

                {/* Delete row */}
                <div className="pt-1 border-t border-border/50">
                    {confirmDelete ? (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-destructive font-medium flex-1">Delete this lecture?</span>
                            <button onClick={() => onDelete(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground font-bold hover:opacity-80 transition-opacity">
                                Yes
                            </button>
                            <button onClick={() => setConfirmDelete(false)}
                                className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
                                No
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 className="w-3 h-3" /> Delete lecture
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'lectures';

export default function DashboardPage() {
    const { user, accessToken, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>('home');

    // Home tab state
    const [appState, setAppState] = useState<'idle' | 'loading' | 'done' | 'streaming' | 'quiz'>('idle');
    const [summary, setSummary] = useState<any>(null);
    const [showFlashcards, setShowFlashcards] = useState(false);

    // Streaming state
    const [streamingLectureId, setStreamingLectureId] = useState<string | null>(null);
    const [streamingFileName, setStreamingFileName] = useState<string>('');

    // Shared data
    const [provider, setProvider] = useState<string | null>(null);
    const [history, setHistory] = useState<LectureHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState('');
    const [stats, setStats] = useState<UserStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // My Lectures tab state
    const [search, setSearch] = useState('');

    // ── Streaming hook ──────────────────────────────────────────────────────
    const {
        summary: streamingSummary,
        isStreaming,
        isComplete: isStreamComplete,
        isConnected,
        error: streamError,
        triggerStream,
    } = useSummaryStream(streamingLectureId, accessToken);

    // Track whether we've already auto-triggered for the current lecture
    const hasAutoTriggeredRef = useRef(false);

    // Reset the trigger guard when lectureId changes
    useEffect(() => {
        hasAutoTriggeredRef.current = false;
    }, [streamingLectureId]);

    // Auto-trigger streaming ONCE when lectureId is set and WebSocket is connected
    useEffect(() => {
        if (
            streamingLectureId &&
            isConnected &&
            appState === 'streaming' &&
            !hasAutoTriggeredRef.current
        ) {
            hasAutoTriggeredRef.current = true;
            triggerStream();
        }
    }, [streamingLectureId, isConnected, appState, triggerStream]);


    // ── Fetchers ──────────────────────────────────────────────────────────────

    const fetchHistory = useCallback(async () => {
        if (!accessToken) return;
        setHistoryLoading(true); setHistoryError('');
        try { setHistory(await getLectureHistory(accessToken)); }
        catch (e: any) { setHistoryError(e.message || 'Failed to load history'); }
        finally { setHistoryLoading(false); }
    }, [accessToken]);

    const fetchStats = useCallback(async () => {
        if (!accessToken) return;
        setStatsLoading(true);
        try { setStats(await getUserStats(accessToken)); }
        catch { setStats(null); }
        finally { setStatsLoading(false); }
    }, [accessToken]);

    useEffect(() => {
        if (accessToken) {
            checkHealth().then(d => setProvider(d.provider)).catch(() => setProvider('ollama'));
            fetchHistory();
            fetchStats();
        }
    }, [accessToken, fetchHistory, fetchStats]);

    const handleDelete = async (id: string) => {
        if (!accessToken) return;
        try {
            await deleteLecture(id, accessToken);
            setHistory(prev => prev.filter(h => h.id !== id));
            fetchStats();
        } catch { }
    };

    const handleLoading = (v: boolean) => setAppState(v ? 'loading' : 'idle');
    const handleSummaryReady = (d: any) => { setSummary(d); setAppState('done'); fetchHistory(); fetchStats(); };

    // NEW: Handle streaming — called by SmartUploadPanel after fast upload
    const handleStreamReady = (lectureId: string, fileName: string) => {
        setStreamingLectureId(lectureId);
        setStreamingFileName(fileName);
        setAppState('streaming');
        fetchHistory(); // Refresh sidebar
    };

    const handleReset = () => {
        setSummary(null);
        setStreamingLectureId(null);
        setStreamingFileName('');
        setAppState('idle');
    };

    const PROVIDER_LABELS: Record<string, string> = {
        openai: 'OpenAI GPT-4', claude: 'Anthropic Claude',
        gemini: 'Google Gemini', ollama: 'Ollama Local',
    };
    const providerLabel = (p: string | null) => PROVIDER_LABELS[p?.toLowerCase() || ''] ?? p ?? '';

    const canFlashcard = summary &&
        ((summary.keyPoints?.length ?? 0) + (summary.definitions?.length ?? 0)) > 0;

    // Filtered lectures for My Lectures tab
    const filteredHistory = history.filter(h =>
        h.fileName.toLowerCase().includes(search.toLowerCase())
    );

    const NAV_TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
        { id: 'home', label: 'Home', icon: Home },
        { id: 'lectures', label: 'My Lectures', icon: Library },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-[0.03]"
                    style={{ background: 'hsl(263 70% 50%)' }} />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-[0.03]"
                    style={{ background: 'hsl(217 91% 60%)' }} />
            </div>

            {/* Flashcard overlay */}
            <AnimatePresence>
                {showFlashcards && summary && (
                    <FlashcardModal
                        keyPoints={summary.keyPoints || []}
                        definitions={summary.definitions || []}
                        title={summary.title || 'Lecture'}
                        onClose={() => setShowFlashcards(false)}
                    />
                )}
            </AnimatePresence>

            {/* ══════════════════ HEADER ══════════════════ */}
            <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    {/* Top bar */}
                    <div className="flex items-center justify-between h-14">
                        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                                style={{ background: 'var(--gradient-brand)' }}>
                                <GraduationCap className="w-4 h-4 text-primary-foreground" />
                            </div>
                            <span className="font-bold text-foreground hidden sm:inline tracking-tight">LearnAI</span>
                        </button>

                        <div className="flex items-center gap-3">
                            {provider && (
                                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
                                    <Bot className="w-3.5 h-3.5" /> {providerLabel(provider)}
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground"
                                    style={{ background: 'var(--gradient-brand)' }}>
                                    {user?.fullName?.[0]?.toUpperCase() || '?'}
                                </div>
                                <span className="text-sm font-semibold text-foreground hidden sm:inline">
                                    {user?.fullName}
                                </span>
                            </div>
                            <button onClick={logout}
                                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Sign out">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tab navigation bar */}
                    <div className="flex gap-1 -mb-px">
                        {NAV_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${activeTab === tab.id
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === 'lectures' && history.length > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                                        {history.length}
                                    </span>
                                )}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                        style={{ background: 'var(--gradient-brand)' }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* ══════════════════ PAGE CONTENT ══════════════════ */}
            <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <AnimatePresence mode="wait">

                    {/* ══════════ HOME TAB ══════════ */}
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-8"
                        >
                            {/* ── Stats row ── */}
                            {(statsLoading || stats) && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart2 className="w-4 h-4 text-primary" />
                                        <h2 className="text-sm font-bold text-foreground">Your Study Stats</h2>
                                        {statsLoading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin ml-1" />}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                        <StatCard icon={Layers} label="Lectures Uploaded" value={stats?.totalLectures ?? '—'} sub="total PDFs" />
                                        <StatCard icon={BookOpen} label="Pages Processed" value={stats?.totalPagesProcessed ?? '—'} sub="by AI" />
                                        <StatCard icon={Brain} label="Quizzes Taken" value={stats?.totalQuizAttempts ?? '—'} sub="total attempts" />
                                        <StatCard icon={Target} label="Avg Quiz Score" value={stats ? `${stats.averageQuizScore}%` : '—'} sub="across all" gradient />
                                        <StatCard icon={TrendingUp} label="Study Days" value={stats?.studyDaysThisMonth ?? '—'} sub="this month" />
                                    </div>
                                </section>
                            )}

                            {/* ── Quiz score history strip ── */}
                            {stats && stats.recentQuizzes.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Star className="w-4 h-4 text-primary" />
                                        <h2 className="text-sm font-bold text-foreground">Recent Quiz Results</h2>
                                    </div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                                        {stats.recentQuizzes.map((q, i) => (
                                            <motion.div key={i}
                                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="glass-card p-4 min-w-[155px] snap-start flex flex-col gap-2 shrink-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-2xl font-extrabold"
                                                        style={{ color: gradeColor(q.percentage) }}>
                                                        {q.percentage}%
                                                    </span>
                                                    <span className="text-lg">
                                                        {q.percentage >= 80 ? '🏆' : q.percentage >= 60 ? '👍' : '📚'}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-foreground truncate">{q.lectureFileName}</p>
                                                <p className="text-[11px] text-muted-foreground">{q.attemptedAt}</p>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full w-fit"
                                                    style={{
                                                        background: `${gradeColor(q.percentage)}18`,
                                                        color: gradeColor(q.percentage),
                                                    }}>
                                                    {q.grade}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Main grid: Upload + Sidebar ── */}
                            <div className={`grid grid-cols-1 ${appState === 'streaming' ? '' : 'lg:grid-cols-3'} gap-8`}>
                                {/* Upload / Summary / Streaming / Quiz panel */}
                                <div className={`${appState === 'streaming' ? '' : 'lg:col-span-2'} space-y-5`}>
                                    {appState === 'idle' && (
                                        <div>
                                            <h1 className="text-3xl font-extrabold text-foreground mb-1">
                                                {user?.fullName ? `Hello, ${user.fullName.split(' ')[0]} 👋` : 'Dashboard'}
                                            </h1>
                                            <p className="text-muted-foreground mb-6">
                                                Upload a lecture PDF to get an AI summary — then ask questions or take a quiz
                                            </p>
                                        </div>
                                    )}

                                    <AnimatePresence mode="wait">
                                        {appState === 'idle' && (
                                            <motion.div key="upload"
                                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                                <SmartUploadPanel
                                                    accessToken={accessToken!}
                                                    onSummaryReady={handleSummaryReady}
                                                    onLoading={handleLoading}
                                                    onStreamReady={handleStreamReady}
                                                />
                                            </motion.div>
                                        )}

                                        {appState === 'loading' && <LoadingAnimation key="loading" />}

                                        {/* ── Chat-style streaming view ── */}
                                        {appState === 'streaming' && streamingLectureId && (
                                            <motion.div key="streaming"
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                            >
                                                <ChatView
                                                    lectureId={streamingLectureId}
                                                    fileName={streamingFileName}
                                                    accessToken={accessToken!}
                                                    streamingSummary={streamingSummary}
                                                    isStreaming={isStreaming}
                                                    isComplete={isStreamComplete}
                                                    isConnected={isConnected}
                                                    streamError={streamError}
                                                    triggerStream={triggerStream}
                                                    onReset={handleReset}
                                                    onStreamReady={handleStreamReady}
                                                />
                                            </motion.div>
                                        )}

                                        {appState === 'done' && summary && (
                                            <motion.div key="summary" className="space-y-4">
                                                {/* Toolbar */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {canFlashcard && (
                                                        <button onClick={() => setShowFlashcards(true)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                                                            <Layers2 className="w-3.5 h-3.5 text-primary" />
                                                            Flashcards ({(summary.keyPoints?.length ?? 0) + (summary.definitions?.length ?? 0)})
                                                        </button>
                                                    )}
                                                    <button onClick={() => exportSummaryAsMd(summary)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                                                        <Download className="w-3.5 h-3.5 text-primary" /> Export .md
                                                    </button>
                                                    {summary.lectureId && (
                                                        <button onClick={() => navigate(`/lecture/${summary.lectureId}`)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                                                            <BookMarked className="w-3.5 h-3.5 text-primary" /> Full Page
                                                        </button>
                                                    )}
                                                    <button onClick={handleReset}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors ml-auto">
                                                        <X className="w-3.5 h-3.5" /> New Upload
                                                    </button>
                                                </div>
                                                <SummaryView
                                                    summary={summary}
                                                    onReset={handleReset}
                                                    onTakeQuiz={summary.lectureId ? () => setAppState('quiz') : undefined}
                                                    onAskQuestions={summary.lectureId
                                                        ? () => navigate(`/lecture/${summary.lectureId}?tab=chat`)
                                                        : undefined}
                                                />
                                            </motion.div>
                                        )}

                                        {appState === 'quiz' && summary?.lectureId && (
                                            <QuizView
                                                key="quiz"
                                                lectureId={summary.lectureId}
                                                lectureTitle={summary.title || 'Lecture'}
                                                accessToken={accessToken!}
                                                onBack={() => { setAppState('done'); fetchStats(); }}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Tips / Quick Access sidebar */}
                                <div className="lg:col-span-1 space-y-5">
                                    {/* Quick access to recent lectures */}
                                    {history.length > 0 && (
                                        <div className="glass-card p-5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Library className="w-4 h-4 text-primary" />
                                                    <h3 className="text-sm font-bold text-foreground">Recent Lectures</h3>
                                                </div>
                                                <button onClick={() => setActiveTab('lectures')}
                                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                                                    View all <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {history.slice(0, 4).map(item => (
                                                    <div key={item.id}
                                                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer"
                                                        onClick={() => navigate(`/lecture/${item.id}`)}>
                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <FileText className="w-3.5 h-3.5 text-primary" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-foreground truncate">{item.fileName}</p>
                                                            <p className="text-[11px] text-muted-foreground">{item.pageCount} pages</p>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={e => { e.stopPropagation(); navigate(`/lecture/${item.id}?tab=chat`); }}
                                                                className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                                                                title="Ask Questions">
                                                                <MessageSquare className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); navigate(`/lecture/${item.id}?tab=quiz`); }}
                                                                className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
                                                                title="Take Quiz">
                                                                <Brain className="w-3 h-3 text-muted-foreground hover:text-primary" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {history.length > 4 && (
                                                <button onClick={() => setActiveTab('lectures')}
                                                    className="w-full text-center text-xs font-semibold text-primary hover:underline py-1">
                                                    +{history.length - 4} more lectures &rarr;
                                                </button>
                                            )}
                                        </div>
                                    )}


                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ══════════ MY LECTURES TAB ══════════ */}
                    {activeTab === 'lectures' && (
                        <motion.div
                            key="lectures"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-6"
                        >
                            {/* Section header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-extrabold text-foreground">My Lectures</h1>
                                    <p className="text-muted-foreground mt-1">
                                        {history.length > 0
                                            ? `${history.length} lecture${history.length !== 1 ? 's' : ''} — click any to view summary, ask questions, or take a quiz`
                                            : 'No lectures yet — upload your first PDF on the Home tab'}
                                    </p>
                                </div>
                                <button onClick={() => setActiveTab('home')}
                                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all hover:opacity-90"
                                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                                    + Upload New PDF
                                </button>
                            </div>

                            {/* Search bar */}
                            {history.length > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search lectures by filename..."
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                                        />
                                        {search && (
                                            <button onClick={() => setSearch('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground hidden sm:inline">
                                        {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}

                            {/* Error state */}
                            {historyError && (
                                <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {historyError}
                                </div>
                            )}

                            {/* Loading */}
                            {historyLoading && (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                                    <p className="text-sm text-muted-foreground">Loading your lectures...</p>
                                </div>
                            )}

                            {/* Empty state */}
                            {!historyLoading && history.length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center py-24 gap-5 text-center">
                                    <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                                        style={{ background: 'hsl(var(--primary) / 0.08)' }}>
                                        <Library className="w-10 h-10 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-bold text-foreground">No lectures yet</h2>
                                        <p className="text-muted-foreground max-w-sm">
                                            Upload your first lecture PDF on the Home tab and it will appear here.
                                        </p>
                                    </div>
                                    <button onClick={() => setActiveTab('home')}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground"
                                        style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                                        Go to Home &amp; Upload
                                    </button>
                                </motion.div>
                            )}

                            {/* No search results */}
                            {!historyLoading && history.length > 0 && filteredHistory.length === 0 && (
                                <div className="text-center py-16 space-y-3">
                                    <Search className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                                    <p className="text-sm font-semibold text-foreground">No lectures match "{search}"</p>
                                    <button onClick={() => setSearch('')}
                                        className="text-xs text-primary hover:underline">Clear search</button>
                                </div>
                            )}

                            {/* Lecture grid */}
                            {!historyLoading && filteredHistory.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredHistory.map((item, i) => (
                                        <LectureCard
                                            key={item.id}
                                            item={item}
                                            index={i}
                                            onDelete={handleDelete}
                                            navigate={navigate}
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* Footer */}
            <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border/50 mt-12">
                LearnAI &middot; AI Teaching Assistant &middot; {new Date().getFullYear()}
            </footer>
        </div>
    );
}

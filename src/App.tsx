import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UploadLecture from './components/UploadLecture';
import SummaryView from './components/SummaryView';
import QuizView from './components/QuizView';
import { checkHealth } from './services/api';
import LoadingAnimation from './components/LoadingAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, LogOut, Bot } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout, accessToken } = useAuth();

  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [appState, setAppState] = useState<'idle' | 'loading' | 'done' | 'quiz'>('idle');
  const [summary, setSummary] = useState<any>(null);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      checkHealth()
        .then(d => setProvider(d.provider))
        .catch(() => setProvider('openai'));
    }
  }, [isAuthenticated]);

  const handleLoading = (v: boolean) => setAppState(v ? 'loading' : 'idle');
  const handleSummaryReady = (d: any) => { setSummary(d); setAppState('done'); };
  const handleReset = () => { setSummary(null); setAppState('idle'); };

  const providerLabel = (p: string | null) =>
    ({ openai: 'OpenAI GPT-4', claude: 'Anthropic Claude', gemini: 'Google Gemini' } as Record<string, string>)[p?.toLowerCase() || ''] || p;

  // 1. Hydration spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner spinner-lg" />
          <p className="text-muted-foreground font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  // 2. Not authenticated
  if (!isAuthenticated) {
    return authView === 'login'
      ? <LoginPage onNavigateSignup={() => setAuthView('signup')} />
      : <SignupPage onNavigateLogin={() => setAuthView('login')} />;
  }

  // 3. Authenticated — main app
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground hidden sm:inline">AI Teaching Assistant</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {user?.fullName?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:inline">{user?.fullName}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground mb-2">
            Upload & Summarize
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload your lecture PDF and get an AI-powered structured summary instantly
          </p>
          {provider && (
            <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <Bot className="w-3.5 h-3.5" />
              Powered by {providerLabel(provider)}
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {appState === 'idle' && (
            <UploadLecture
              key="upload"
              onSummaryReady={handleSummaryReady}
              onLoading={handleLoading}
              accessToken={accessToken!}
            />
          )}

          {appState === 'loading' && (
            <LoadingAnimation key="loading" />
          )}

          {appState === 'done' && summary && (
            <SummaryView
              key="summary"
              summary={summary}
              onReset={handleReset}
              onTakeQuiz={summary.lectureId ? () => setAppState('quiz') : undefined}
            />
          )}

          {appState === 'quiz' && summary?.lectureId && (
            <QuizView
              key="quiz"
              lectureId={summary.lectureId}
              lectureTitle={summary.title || 'Lecture'}
              accessToken={accessToken!}
              onBack={() => setAppState('done')}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        AI Teaching Assistant v1.0 · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;

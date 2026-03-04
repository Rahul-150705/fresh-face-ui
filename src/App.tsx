import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import LandingPage from './pages/LandingPage';
import ChatPage from './components/chat/ChatPage';

// ── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

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

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/chat" replace /> : <>{children}</>;
}

// ── Page wrappers ─────────────────────────────────────────────────────────────

function LoginPageWrapper() {
  const navigate = useNavigate();
  return <LoginPage onNavigateSignup={() => navigate('/signup')} />;
}

function SignupPageWrapper() {
  const navigate = useNavigate();
  return <SignupPage onNavigateLogin={() => navigate('/login')} />;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages */}
      <Route path="/login" element={<AuthRoute><LoginPageWrapper /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPageWrapper /></AuthRoute>} />

      {/* ChatGPT-style home — the main chat experience */}
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;

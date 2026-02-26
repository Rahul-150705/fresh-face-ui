import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import LectureDetailPage from './pages/LectureDetailPage';
import LandingPage from './pages/LandingPage';

// ── Route guards ──────────────────────────────────────────────────────────────

/** Authenticated users only — redirects to /login if not logged in */
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

/** Auth pages (/login, /signup) — redirects already-logged-in users to /dashboard */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
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
      {/* Public home — landing page (anyone can see this) */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages — redirect to dashboard if already logged in */}
      <Route path="/login" element={<AuthRoute><LoginPageWrapper /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignupPageWrapper /></AuthRoute>} />

      {/* Protected pages — require login */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/lecture/:lectureId" element={<ProtectedRoute><LectureDetailPage /></ProtectedRoute>} />

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

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface User {
  email: string;
  fullName: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (fullName: string, email: string, password: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  ACCESS_TOKEN:  'ta_access_token',
  REFRESH_TOKEN: 'ta_refresh_token',
  USER:          'ta_user',
  ACCESS_EXP:    'ta_access_exp',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_EXP);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const persistAuth = useCallback((authResponse: any) => {
    const { accessToken: at, refreshToken, accessExpiresIn, email, fullName } = authResponse;
    const userData = { email, fullName };

    setAccessToken(at);
    setUser(userData);

    sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, at);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    sessionStorage.setItem(STORAGE_KEYS.ACCESS_EXP, String(Date.now() + accessExpiresIn));

    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    scheduleTokenRefresh(accessExpiresIn);
  }, []);

  const doRefresh = useCallback(async () => {
    const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!storedRefresh) { clearAuth(); return; }

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!res.ok) throw new Error('Refresh failed');

      const data = await res.json();
      persistAuth(data);
    } catch {
      clearAuth();
    }
  }, [clearAuth, persistAuth]);

  const scheduleTokenRefresh = useCallback((expiresInMs: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(expiresInMs - 60_000, 0);
    refreshTimerRef.current = setTimeout(doRefresh, delay);
  }, [doRefresh]);

  useEffect(() => {
    const hydrate = async () => {
      const storedToken = sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedUser  = sessionStorage.getItem(STORAGE_KEYS.USER);
      const storedExp   = sessionStorage.getItem(STORAGE_KEYS.ACCESS_EXP);

      if (storedToken && storedUser && storedExp) {
        const msLeft = Number(storedExp) - Date.now();
        if (msLeft > 5000) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
          scheduleTokenRefresh(msLeft);
        } else {
          await doRefresh();
        }
      } else {
        const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (storedRefresh) await doRefresh();
      }

      setIsLoading(false);
    };

    hydrate();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [doRefresh, scheduleTokenRefresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    persistAuth(data);
    return data;
  };

  const signup = async (fullName: string, email: string, password: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    persistAuth(data);
    return data;
  };

  const logout = () => clearAuth();

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

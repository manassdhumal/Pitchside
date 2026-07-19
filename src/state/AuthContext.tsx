import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { clearCache } from '../storage/cache';

export interface User {
  id: string;
  username: string;
}

interface AuthValue {
  user: User | null;
  /** True until the initial /me check resolves, so the app doesn't flash the login screen. */
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: User | null }>('/api/auth/me')
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const r = await api.post<{ user: User }>('/api/auth/login', { username, password });
    setUser(r.user);
  };
  const register = async (username: string, password: string) => {
    const r = await api.post<{ user: User }>('/api/auth/register', { username, password });
    setUser(r.user);
  };
  const logout = async () => {
    try { await api.post('/api/auth/logout', {}); } catch { /* clear locally regardless */ }
    clearCache();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

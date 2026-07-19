import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { clearCache, setStorageMode } from '../storage/cache';

export interface User {
  id: string;
  username: string;
}

const GUEST_KEY = 'ps_guest';

interface AuthValue {
  user: User | null;
  /** Playing without an account — data is saved locally on this device only. */
  isGuest: boolean;
  /** True until the initial /me check resolves, so the app doesn't flash the login screen. */
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  /** Leave guest mode to reach the sign-in screen (local guest data stays on the device). */
  exitGuest: () => void;
}

const AuthCtx = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ user: User | null }>('/api/auth/me')
      .then((r) => {
        if (r.user) {
          setUser(r.user);
          setStorageMode('api');
        } else if (localStorage.getItem(GUEST_KEY)) {
          setIsGuest(true);
          setStorageMode('local');
        }
      })
      .catch(() => { /* server down → stay on the gate; guest still available */ })
      .finally(() => setLoading(false));
  }, []);

  const onSignedIn = (u: User) => {
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
    setUser(u);
    setStorageMode('api');
  };

  const login = async (username: string, password: string) => {
    onSignedIn((await api.post<{ user: User }>('/api/auth/login', { username, password })).user);
  };
  const register = async (username: string, password: string) => {
    onSignedIn((await api.post<{ user: User }>('/api/auth/register', { username, password })).user);
  };
  const logout = async () => {
    try { await api.post('/api/auth/logout', {}); } catch { /* clear locally regardless */ }
    clearCache();
    setUser(null);
    setStorageMode('api');
  };

  const continueAsGuest = () => {
    localStorage.setItem(GUEST_KEY, '1');
    setStorageMode('local');
    setIsGuest(true);
  };
  const exitGuest = () => {
    localStorage.removeItem(GUEST_KEY);
    clearCache();
    setIsGuest(false);
    setStorageMode('api');
  };

  return (
    <AuthCtx.Provider value={{ user, isGuest, loading, login, register, logout, continueAsGuest, exitGuest }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

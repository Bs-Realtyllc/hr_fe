'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getUser, getToken, setAuth, clearAuth } from '@/lib/auth';
import type { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getUser());
    setToken(getToken());
    setLoading(false);
  }, []);

  const queryClient = useQueryClient();

  // Cached server data belongs to whoever was signed in; drop it whenever the
  // user changes so one person's data is never shown to the next.
  // (An expired session is handled by lib/api's full-page redirect, which
  // discards the cache anyway.)
  function login(tok: string, u: AuthUser) {
    queryClient.clear();
    setAuth(tok, u);
    setToken(tok);
    setUser(u);
  }

  function logout() {
    queryClient.clear();
    clearAuth();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

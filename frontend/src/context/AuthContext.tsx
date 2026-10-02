'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/types';
import { apiFetch, ApiError, onAuthFailure } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const restoreSession = useCallback(async () => {
    try {
      const currentUser = await apiFetch<User>('/api/auth/me');
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    // Listen to global 401 refresh failure events
    const unsubscribe = onAuthFailure(() => {
      setUser(null);
      if (pathname !== '/login') {
        const returnUrl = encodeURIComponent(pathname);
        router.push(`/login?redirect=${returnUrl}`);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [restoreSession, pathname, router]);

  const login = async (email: string, password: string): Promise<User> => {
    const loggedInUser = await apiFetch<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout to ensure state gets wiped anyway
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const refreshMe = async (): Promise<void> => {
    try {
      const currentUser = await apiFetch<User>('/api/auth/me');
      setUser(currentUser);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

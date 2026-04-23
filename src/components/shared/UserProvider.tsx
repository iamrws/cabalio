'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';

interface UserSummary {
  user: { display_name: string | null; level: number; current_streak: number } | null;
  stats: { weekly_points: number; total_points: number } | null;
}

interface UserContextType {
  summary: UserSummary | null;
  loading: boolean;
  refresh: () => void;
}

const UserContext = createContext<UserContextType>({
  summary: null,
  loading: true,
  refresh: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/me/summary', { cache: 'no-store' });
      if (!mountedRef.current) return;
      if (!res.ok) return;
      const data = await res.json();
      if (!mountedRef.current) return;
      setSummary(data);
    } catch {
      /* silent — components fall back to defaults */
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchSummary();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchSummary();
    }, 120_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchSummary]);

  return (
    <UserContext.Provider value={{ summary, loading, refresh: fetchSummary }}>
      {children}
    </UserContext.Provider>
  );
}

'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/me/summary', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    } catch {
      /* silent — components fall back to defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 60_000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  return (
    <UserContext.Provider value={{ summary, loading, refresh: fetchSummary }}>
      {children}
    </UserContext.Provider>
  );
}

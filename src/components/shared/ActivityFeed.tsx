'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: 'submission' | 'points';
  actor_name: string;
  actor_wallet: string;
  title: string;
  description: string;
  points: number;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchFeed = async () => {
      try {
        const res = await fetch('/api/activity-feed', { cache: 'no-store' });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to load activity feed');
        }
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load activity feed');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-5 h-5 rounded-full bg-bg-raised shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-bg-raised rounded w-3/4" />
              <div className="h-2.5 bg-bg-raised rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-text-secondary">{error}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">No recent activity yet</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-2 border-b border-border-subtle last:border-b-0"
        >
          {/* Icon */}
          <div className="shrink-0 mt-0.5">
            {item.type === 'submission' ? (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#e8c475]/15 text-[10px] leading-none text-accent-text">
                &#9733;
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--positive-muted)] text-[10px] leading-none text-[var(--positive)]">
                +
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-secondary leading-snug truncate">
              <Link
                href={`/profile/${item.actor_wallet}`}
                className="text-accent-text hover:underline"
              >
                {item.actor_name}
              </Link>{' '}
              {item.description}
            </p>
          </div>

          {/* Timestamp */}
          <span className="shrink-0 text-[11px] font-mono text-text-secondary tabular-nums">
            {relativeTime(item.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

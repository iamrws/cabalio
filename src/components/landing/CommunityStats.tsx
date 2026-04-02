'use client';

import { useEffect, useRef, useState } from 'react';
import AnimatedCounter from '../shared/AnimatedCounter';

interface CommunityStatsData {
  activeMembers: number;
  submissions: number;
  pointsDistributed: number;
}

function useInView(ref: React.RefObject<HTMLElement | null>, once = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once]);
  return inView;
}

export default function CommunityStats() {
  const [data, setData] = useState<CommunityStatsData>({
    activeMembers: 0,
    submissions: 0,
    pointsDistributed: 0,
  });

  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/community-stats', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        setData({
          activeMembers: json.active_members ?? 0,
          submissions: json.total_submissions ?? 0,
          pointsDistributed: json.total_points ?? 0,
        });
      } catch {
        // Endpoint may not exist yet — keep defaults at 0
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const stats = [
    { label: 'Active Members', value: data.activeMembers, suffix: '', description: 'NFT holders engaging daily' },
    { label: 'Submissions', value: data.submissions, suffix: '', description: 'Content pieces scored by AI' },
    { label: 'Points Distributed', value: data.pointsDistributed, suffix: '', description: 'Total points earned by community' },
  ];
  return (
    <section className="py-24 px-6 bg-bg-base">
      <div className="max-w-6xl mx-auto">
        <div
          ref={headerRef}
          className="text-center mb-16 transition-all duration-700 ease-out"
          style={{
            opacity: headerInView ? 1 : 0,
            transform: headerInView ? 'translateY(0)' : 'translateY(20px)',
          }}
        >
          <h2 className="font-display text-3xl md:text-5xl mb-4 text-text-primary font-semibold">
            Community Pulse
          </h2>
          <p className="text-text-secondary text-lg">
            Real-time stats from the Cabal engagement platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({ stat, index }: { stat: { label: string; value: number; suffix: string; description: string }; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);

  return (
    <div
      ref={ref}
      className="text-center p-6 rounded-2xl bg-bg-surface/80 border border-border-subtle shadow-sm transition-all duration-500 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'scale(1)' : 'scale(0.95)',
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="text-3xl md:text-4xl font-bold mb-2">
        <AnimatedCounter
          value={stat.value}
          suffix={stat.suffix}
          className="text-accent-text"
        />
      </div>
      <div className="text-sm font-semibold text-text-primary mb-1">
        {stat.label}
      </div>
      <div className="text-xs text-text-tertiary">
        {stat.description}
      </div>
    </div>
  );
}

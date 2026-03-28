'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from '../shared/AnimatedCounter';

interface CommunityStatsData {
  activeMembers: number;
  submissions: number;
  pointsDistributed: number;
}

// TODO: Create a public /api/community-stats endpoint that returns aggregate
// community metrics (active holder count, total submissions, total points).
// The existing /api/leaderboard and /api/me/summary endpoints require
// authentication and are per-user, so they cannot serve this landing page.
// Until then, this component fetches from /api/community-stats and falls back
// to zeros if the endpoint does not exist.

export default function CommunityStats() {
  const [data, setData] = useState<CommunityStatsData>({
    activeMembers: 0,
    submissions: 0,
    pointsDistributed: 0,
  });

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl md:text-5xl mb-4 text-text-primary font-semibold">
            Community Pulse
          </h2>
          <p className="text-text-secondary text-lg">
            Real-time stats from the Cabal engagement platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-2xl bg-bg-surface/80 border border-border-subtle shadow-sm"
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

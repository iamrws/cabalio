'use client';

import { useState } from 'react';

interface WeekHistory {
  week_number: number;
  year: number;
  points: number;
  reward_sol: number;
}

/* ── Earnings History Bar Chart (inline SVG) ── */
export default function EarningsChart({ weeks }: { weeks: WeekHistory[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxPoints = Math.max(...weeks.map((w) => w.points), 1);
  const barCount = weeks.length;
  const chartHeight = 160;
  const barGap = 6;
  const barWidth = `calc((100% - ${(barCount - 1) * barGap}px) / ${barCount})`;

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute -top-12 left-1/2 -translate-x-1/2 bg-bg-raised border border-border-subtle rounded-lg px-3 py-1.5 text-xs font-mono shadow-lg z-10 whitespace-nowrap pointer-events-none transition-opacity duration-150"
        >
          <span className="text-text-primary">{weeks[hoveredIdx].points} pts</span>
          <span className="text-text-muted mx-1">·</span>
          <span className="text-accent-text">{weeks[hoveredIdx].reward_sol.toFixed(4)} SOL</span>
        </div>
      )}

      {/* Bars */}
      <div
        className="flex items-end"
        style={{ height: chartHeight, gap: barGap }}
      >
        {weeks.map((week, idx) => {
          const isCurrentWeek = idx === weeks.length - 1;
          const heightPct = maxPoints > 0 ? (week.points / maxPoints) * 100 : 0;
          const minHeight = week.points > 0 ? 4 : 1;
          return (
            <div
              key={`${week.year}-${week.week_number}`}
              className="flex flex-col items-center justify-end"
              style={{ width: barWidth, height: '100%' }}
            >
              <div
                className={`w-full rounded-t-md cursor-pointer transition-[background-color] duration-500 ${
                  isCurrentWeek
                    ? 'bg-accent'
                    : hoveredIdx === idx
                      ? 'bg-accent/70'
                      : 'bg-accent/30'
                }`}
                style={{ minHeight, height: `${Math.max(heightPct, minHeight / chartHeight * 100)}%` }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </div>
          );
        })}
      </div>

      {/* Week labels */}
      <div className="flex mt-2" style={{ gap: barGap }}>
        {weeks.map((week, idx) => {
          const isCurrentWeek = idx === weeks.length - 1;
          return (
            <div
              key={`label-${week.year}-${week.week_number}`}
              className={`text-center text-[10px] font-mono ${
                isCurrentWeek ? 'text-accent-text' : 'text-text-muted'
              }`}
              style={{ width: barWidth }}
            >
              {isCurrentWeek ? 'Now' : `W${week.week_number}`}
            </div>
          );
        })}
      </div>
    </div>
  );
}

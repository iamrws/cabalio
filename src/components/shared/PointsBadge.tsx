'use client';

import { motion } from 'framer-motion';

interface PointsBadgeProps {
  points: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function PointsBadge({ points, size = 'md', showLabel = true }: PointsBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      role="status"
      aria-label={`${points.toLocaleString()} points`}
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-accent-muted border border-accent-border
        font-mono font-bold text-accent-text
        ${sizeMap[size]}
      `}
    >
      <svg viewBox="0 0 16 16" className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} fill="currentColor" aria-hidden="true">
        <path d="M8 0L10.2 5.3L16 6.2L11.9 10.1L12.9 16L8 13.3L3.1 16L4.1 10.1L0 6.2L5.8 5.3L8 0Z" />
      </svg>
      {points.toLocaleString()}
      {showLabel && <span className="text-accent-text/60 font-normal">pts</span>}
    </motion.div>
  );
}

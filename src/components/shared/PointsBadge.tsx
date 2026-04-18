import { Star } from 'lucide-react';

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
    <div
      role="status"
      aria-label={`${points.toLocaleString()} points`}
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-accent-muted border border-accent-border
        font-mono font-bold text-accent-text
        animate-in fade-in zoom-in-95 duration-200
        ${sizeMap[size]}
      `}
    >
      <Star className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden="true" />
      {points.toLocaleString()}
      {showLabel && <span className="text-accent-text/60 font-normal">pts</span>}
    </div>
  );
}

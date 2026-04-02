'use client';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export default function LoadingSkeleton({ className = '', lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading content">
      <span className="sr-only">Loading...</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-bg-raised animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-bg-surface/80 border border-border-subtle p-6 space-y-4 animate-pulse shadow-sm"
      role="status"
      aria-label="Loading card"
    >
      <span className="sr-only">Loading...</span>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-bg-overlay border border-border-subtle" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-bg-overlay border border-border-subtle" />
          <div className="h-3 w-16 rounded bg-bg-overlay border border-border-subtle" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-bg-overlay border border-border-subtle" />
        <div className="h-4 w-3/4 rounded bg-bg-overlay border border-border-subtle" />
      </div>
    </div>
  );
}

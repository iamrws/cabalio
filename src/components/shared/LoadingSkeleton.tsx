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
          className="h-4 rounded bg-stone-200/60 animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-2xl bg-white/80 border border-stone-200/60 p-6 space-y-4 animate-pulse shadow-[0_4px_20px_rgba(28,25,23,0.06)]"
      role="status"
      aria-label="Loading card"
    >
      <span className="sr-only">Loading...</span>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-stone-200/60" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-stone-200/60" />
          <div className="h-3 w-16 rounded bg-stone-200/60" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-stone-200/60" />
        <div className="h-4 w-3/4 rounded bg-stone-200/60" />
      </div>
    </div>
  );
}

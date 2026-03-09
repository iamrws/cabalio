'use client';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export default function LoadingSkeleton({ className = '', lines = 1 }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-bg-tertiary animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-bg-secondary border border-border-subtle p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-bg-tertiary" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-bg-tertiary" />
          <div className="h-3 w-16 rounded bg-bg-tertiary" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-bg-tertiary" />
        <div className="h-4 w-3/4 rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

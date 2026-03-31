export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-56 bg-bg-surface/50 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-bg-surface/50 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

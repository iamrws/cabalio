export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-48 bg-bg-surface/50 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-bg-surface/50 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-bg-surface/50 rounded-2xl" />
    </div>
  );
}

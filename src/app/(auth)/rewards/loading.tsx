export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-48 bg-bg-surface/50 rounded-xl" />
      <div className="h-20 bg-bg-surface/50 rounded-xl" />
      <div className="space-y-3">
        <div className="h-16 bg-bg-surface/50 rounded-xl" />
        <div className="h-16 bg-bg-surface/50 rounded-xl" />
        <div className="h-16 bg-bg-surface/50 rounded-xl" />
        <div className="h-16 bg-bg-surface/50 rounded-xl" />
      </div>
    </div>
  );
}

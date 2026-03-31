export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-bg-surface/50 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-28 bg-bg-surface/50 rounded-xl" />
        <div className="h-28 bg-bg-surface/50 rounded-xl" />
        <div className="h-28 bg-bg-surface/50 rounded-xl" />
      </div>
      <div className="h-64 bg-bg-surface/50 rounded-xl" />
      <div className="h-64 bg-bg-surface/50 rounded-xl" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-44 bg-bg-surface/50 rounded-xl" />
      <div className="grid gap-4">
        <div className="h-36 bg-bg-surface/50 rounded-xl" />
        <div className="h-36 bg-bg-surface/50 rounded-xl" />
        <div className="h-36 bg-bg-surface/50 rounded-xl" />
      </div>
    </div>
  );
}

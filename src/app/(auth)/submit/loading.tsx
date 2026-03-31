export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-52 bg-bg-surface/50 rounded-xl" />
      <div className="space-y-4">
        <div className="h-12 bg-bg-surface/50 rounded-xl" />
        <div className="h-12 bg-bg-surface/50 rounded-xl" />
        <div className="h-32 bg-bg-surface/50 rounded-xl" />
        <div className="h-12 w-36 bg-bg-surface/50 rounded-xl" />
      </div>
    </div>
  );
}

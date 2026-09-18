export function LoadingState({ label = "Загрузка…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-surface-3" />
      ))}
    </div>
  );
}

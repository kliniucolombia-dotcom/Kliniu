export function Skeleton({ className = "" }: { className?: string }) {
  // span block: válido también dentro de <p> (KPIs del calendario).
  return <span aria-hidden className={`block animate-pulse rounded-xl bg-[#F1F5F9] ${className}`} />;
}

export function SkeletonCard({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-2xl border border-[#E2E8F0] bg-white p-5 ${className}`}>{children}</div>;
}

export function SkeletonHeader() {
  return (
    <div className="mb-5 space-y-2">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-72 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function SkeletonKpis({ n = 4, className = "sm:grid-cols-2 lg:grid-cols-4" }: { n?: number; className?: string }) {
  return (
    <div className={`mb-6 grid gap-4 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <SkeletonCard key={i} className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <SkeletonCard className="p-4">
      <div className="mb-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, i) => <Skeleton key={i} className="h-3" />)}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className="h-9" />)}
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

/** Página completa del panel mientras carga (cabecera + KPIs + tabla). */
export function SkeletonPanelPage() {
  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8" role="status" aria-label="Cargando">
      <SkeletonHeader />
      <SkeletonKpis />
      <SkeletonTable />
    </div>
  );
}

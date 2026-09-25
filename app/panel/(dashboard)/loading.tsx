import { Skeleton, SkeletonCard, SkeletonHeader, SkeletonKpis } from "../../components/skeleton";

export default function Loading() {
  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8" role="status" aria-label="Cargando">
      <SkeletonHeader />
      <SkeletonKpis />
      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <SkeletonCard key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-44" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((k) => <Skeleton key={k} className="h-14" />)}</div>
            <Skeleton className="h-20" />
          </SkeletonCard>
        ))}
      </div>
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <SkeletonCard className="space-y-3 p-6 lg:col-span-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-40" /><Skeleton className="h-48" /></SkeletonCard>
        <SkeletonCard className="space-y-3 p-6"><Skeleton className="h-4 w-32" /><Skeleton className="mx-auto h-40 w-40 rounded-full" /></SkeletonCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} className="space-y-3 p-6"><Skeleton className="h-4 w-36" />{[0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-10" />)}</SkeletonCard>
        ))}
      </div>
    </div>
  );
}

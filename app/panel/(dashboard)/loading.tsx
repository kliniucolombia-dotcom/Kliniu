import { Skeleton as Base } from "../../components/skeleton";

// El fondo del launcher (#F4F6F8) es casi igual al gris por defecto del skeleton: se oscurece un poco para que se vea.
const Skeleton = ({ className = "" }: { className?: string }) => <Base className={`!bg-[#E2E9EC] ${className}`} />;

// Mismo esqueleto que el launcher de /panel: fecha, saludo, 3 chips y la grilla de tiles.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1000px] px-5 pb-32 pt-8 sm:px-6 sm:pt-10" role="status" aria-label="Cargando">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="mt-3 h-10 w-72 sm:h-12 sm:w-96" />
      <div className="mt-6 flex flex-wrap gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[68px] w-[130px] rounded-2xl" />
        ))}
      </div>
      <div className="mt-10 grid grid-cols-3 gap-x-2 gap-y-7 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5">
            <Skeleton className="h-[88px] w-[88px] rounded-[24px]" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

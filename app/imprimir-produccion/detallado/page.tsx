import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermission } from "@/lib/permissions";
import { getProductionRuns } from "@/lib/panel";
import { createEmptyProductionRunFilters, filterProductionRuns, type ProductionRunFilters } from "@/lib/production-filters";
import { fmtDateOnly } from "@/lib/date";
import { ProductionRunDetail } from "../_components/production-run-detail";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function decodeIds(encoded: string | undefined): string[] {
  if (!encoded) return [];
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function decodeFilters(encoded: string | undefined): ProductionRunFilters {
  const empty = createEmptyProductionRunFilters();
  if (!encoded) return empty;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<ProductionRunFilters>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

export default async function DetailedProductionRunsPrintPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") redirect("/login");

  const permission = await getEffectivePermission(user, "MODULE_PRODUCCION");
  if (!permission.canView) notFound();

  const sp = await searchParams;
  const ids = decodeIds(firstValue(sp.i));
  const filters = decodeFilters(firstValue(sp.f));

  const allRuns = await getProductionRuns();
  const runs = ids.length
    ? ids.map((id) => allRuns.find((r) => r.id === id)).filter((r): r is (typeof allRuns)[number] => Boolean(r))
    : filterProductionRuns(allRuns, filters);

  const totals = runs.reduce(
    (acc, run) => ({
      produced: acc.produced + run.produced,
      damaged: acc.damaged + run.damaged,
      nonConforming: acc.nonConforming + run.nonConforming,
      good: acc.good + run.summary.goodPieces,
    }),
    { produced: 0, damaged: 0, nonConforming: 0, good: 0 },
  );
  const quality = totals.produced > 0 ? (totals.good / totals.produced) * 100 : 0;

  const machine = filters.machineId ? allRuns.find((r) => r.machine.id === filters.machineId)?.machine ?? null : null;
  const operatorName = filters.operatorId
    ? allRuns.find((r) => r.operator.id === filters.operatorId)?.operator.fullName ?? null
    : null;
  const productName = filters.product.startsWith("p:")
    ? allRuns.find((r) => r.product?.id === filters.product.slice(2))?.product?.name ?? null
    : filters.product.startsWith("m:")
      ? filters.product.slice(2)
      : null;

  const filterChips = ids.length
    ? [`Selección manual: ${runs.length} ${runs.length === 1 ? "corrida" : "corridas"}`]
    : ([
        filters.from || filters.to
          ? `Periodo: ${filters.from ? fmtDateOnly(filters.from) : "inicio"} — ${filters.to ? fmtDateOnly(filters.to) : "hoy"}`
          : null,
        machine ? `Máquina: ${machine.code} · ${machine.name}` : "Máquinas: todas",
        filters.brand ? `Marca: ${filters.brand}` : null,
        operatorName ? `Operario: ${operatorName}` : null,
        productName ? `Producto: ${productName}` : null,
        filters.orderNumber.trim() ? `N° orden: ${filters.orderNumber.trim()}` : null,
        filters.search.trim() ? `Búsqueda: “${filters.search.trim()}”` : null,
      ].filter(Boolean) as string[]);

  const generatedAt = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

  return (
    <div className="mx-auto max-w-[900px] bg-white p-8 text-[#1A1A1A] print:p-0">
      {/* Portada */}
      <div className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4">
        <img src="/logo.png" alt="Kliniu" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-wide">REPORTE DETALLADO</h1>
          <p className="text-sm font-bold text-[#64748B]">Recorridas de inyección</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Generado el {generatedAt}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {filterChips.map((chip) => (
          <span key={chip} className="rounded-full bg-[#F1F5F9] px-3 py-1 font-semibold text-[#475569]">{chip}</span>
        ))}
        <span className="rounded-full bg-[#E0F7F7] px-3 py-1 font-semibold text-[#0C6060]">
          {runs.length} {runs.length === 1 ? "corrida" : "corridas"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <CoverStat label="Corridas" value={String(runs.length)} />
        <CoverStat label="Piezas producidas" value={totals.produced.toLocaleString("es-CO")} />
        <CoverStat label="Piezas buenas" value={totals.good.toLocaleString("es-CO")} />
        <CoverStat label="% Calidad promedio" value={`${quality.toFixed(2)}%`} accent />
      </div>

      <p className="mt-6 text-xs text-[#94A3B8]">
        A continuación se presenta el detalle completo de cada corrida, una por página.
      </p>

      {/* Detalle por corrida */}
      {runs.map((run, index) => (
        <section
          key={run.id}
          className="mt-6 border-t border-[#E2E8F0] pt-6"
          style={{ breakAfter: index < runs.length - 1 ? "page" : "auto" }}
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
            Corrida {index + 1} de {runs.length}
          </p>
          <ProductionRunDetail run={run} />
        </section>
      ))}

      {runs.length === 0 && (
        <p className="mt-10 text-center text-sm text-[#94A3B8]">No hay corridas para los criterios seleccionados.</p>
      )}

      <div className="mt-8 border-t border-[#E2E8F0] pt-4 text-[10px] text-[#94A3B8]">
        <p>Documento generado automáticamente por el sistema Kliniu a partir de las corridas registradas en la planta de inyección.</p>
      </div>
    </div>
  );
}

function CoverStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${accent ? "text-[#27B1B8]" : "text-[#1A1A1A]"}`}>{value}</p>
    </div>
  );
}

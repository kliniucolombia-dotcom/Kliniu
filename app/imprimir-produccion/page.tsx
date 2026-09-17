import { notFound, redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermission } from "@/lib/permissions";
import { getMachines, getProductionRuns } from "@/lib/panel";
import { createEmptyProductionRunFilters, filterProductionRuns, type ProductionRunFilters } from "@/lib/production-filters";
import { fmtDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

export default async function ProductionHistoryPrintPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") redirect("/login");

  const permission = await getEffectivePermission(user, "MODULE_PRODUCCION");
  if (!permission.canView) notFound();

  const sp = await searchParams;
  const filters = decodeFilters(firstValue(sp.f));

  const [runs, machines] = await Promise.all([getProductionRuns(), getMachines(true)]);
  const filtered = filterProductionRuns(runs, filters);

  const productLabel = (run: (typeof runs)[number]) => run.product?.name ?? run.manualProductName ?? "—";

  const machine = filters.machineId ? machines.find((m) => m.id === filters.machineId) : null;
  const operatorName = filters.operatorId
    ? runs.find((r) => r.operator.id === filters.operatorId)?.operator.fullName ?? null
    : null;
  const productName = filters.product.startsWith("p:")
    ? runs.find((r) => r.product?.id === filters.product.slice(2))?.product?.name ?? null
    : filters.product.startsWith("m:")
      ? filters.product.slice(2)
      : null;

  const rangeChip = (label: string, min: string, max: string) => {
    if (!min.trim() && !max.trim()) return null;
    return `${label}: ${min.trim() || "0"} – ${max.trim() || "∞"}`;
  };

  const totals = filtered.reduce(
    (acc, run) => ({
      produced: acc.produced + run.produced,
      damaged: acc.damaged + run.damaged,
      nonConforming: acc.nonConforming + run.nonConforming,
      good: acc.good + run.summary.goodPieces,
    }),
    { produced: 0, damaged: 0, nonConforming: 0, good: 0 },
  );
  const quality = totals.produced > 0 ? (totals.good / totals.produced) * 100 : 0;

  const generatedAt = new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
  const filterChips = [
    filters.from || filters.to
      ? `Periodo: ${filters.from ? fmtDateOnly(filters.from) : "inicio"} — ${filters.to ? fmtDateOnly(filters.to) : "hoy"}`
      : null,
    machine ? `Máquina: ${machine.code} · ${machine.name}` : "Máquinas: todas",
    filters.brand ? `Marca: ${filters.brand}` : null,
    operatorName ? `Operario: ${operatorName}` : null,
    productName ? `Producto: ${productName}` : null,
    filters.orderNumber.trim() ? `N° orden: ${filters.orderNumber.trim()}` : null,
    filters.search.trim() ? `Búsqueda: “${filters.search.trim()}”` : null,
    rangeChip("Producidas", filters.producedMin, filters.producedMax),
    rangeChip("Dañadas", filters.damagedMin, filters.damagedMax),
    rangeChip("No conf.", filters.nonConformingMin, filters.nonConformingMax),
    rangeChip("Buenas", filters.goodMin, filters.goodMax),
    rangeChip("% Calidad", filters.qualityMin, filters.qualityMax),
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[1100px] bg-white p-8 text-[#1A1A1A] print:p-0">
      <div className="flex items-start justify-between border-b-2 border-[#1A1A1A] pb-4">
        <img src="/logo.png" alt="Kliniu" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-black tracking-wide">HISTORIAL DE RECORRIDAS</h1>
          <p className="text-sm font-bold text-[#64748B]">Planta de inyección</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Generado el {generatedAt}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {filterChips.map((chip) => (
          <span key={chip} className="rounded-full bg-[#F1F5F9] px-3 py-1 font-semibold text-[#475569]">{chip}</span>
        ))}
        <span className="rounded-full bg-[#E0F7F7] px-3 py-1 font-semibold text-[#0C6060]">
          {filtered.length} {filtered.length === 1 ? "recorrida" : "recorridas"}
        </span>
      </div>

      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-[#F8FAFC]">
            {["Fecha", "N° Orden", "Máquina", "Marca", "Operario", "Producto", "Producidas", "Dañadas", "No conf.", "Buenas", "% Calidad"].map((h) => (
              <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[9px] font-bold uppercase tracking-widest text-[#64748B]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((run) => (
            <tr key={run.id} style={{ breakInside: "avoid" }}>
              <td className="border border-[#E2E8F0] px-2 py-1.5">{fmtDateOnly(run.productionDate)}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 font-semibold">{run.orderNumber}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.code} · {run.machine.name}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.brand}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5">{run.operator.fullName}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5">{productLabel(run)}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.produced.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.damaged.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.nonConforming.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold">{run.summary.goodPieces.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold">{run.summary.qualityPercentage.toFixed(2)}%</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={11} className="border border-[#E2E8F0] px-2 py-8 text-center text-sm text-[#94A3B8]">
                Sin recorridas para los filtros seleccionados
              </td>
            </tr>
          )}
        </tbody>
        {filtered.length > 0 && (
          <tfoot>
            <tr className="bg-[#F8FAFC] font-bold">
              <td colSpan={6} className="border border-[#E2E8F0] px-2 py-2 text-right uppercase tracking-wide text-[#64748B]">Totales</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right">{totals.produced.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right">{totals.damaged.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right">{totals.nonConforming.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right">{totals.good.toLocaleString("es-CO")}</td>
              <td className="border border-[#E2E8F0] px-2 py-2 text-right">{quality.toFixed(2)}%</td>
            </tr>
          </tfoot>
        )}
      </table>

      <div className="mt-8 border-t border-[#E2E8F0] pt-4 text-[10px] text-[#94A3B8]">
        <p>Documento generado automáticamente por el sistema Kliniu. La información corresponde a las recorridas registradas en la planta de inyección según los filtros aplicados.</p>
      </div>
    </div>
  );
}

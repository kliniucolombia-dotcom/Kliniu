import { getProductionRunById } from "@/lib/panel";
import { calcProductionEfficiency } from "@/lib/production-calculator";
import { efficiencyTone } from "@/lib/production-tone";
import { fmtDateOnly, fmtTimeOnly } from "@/lib/date";

export type ProductionRunDetailData = NonNullable<Awaited<ReturnType<typeof getProductionRunById>>>;

const fmtPct = (n: number) => `${(n || 0).toFixed(2)}%`;
const cycleUnitLabel = (unit: string) => (unit === "minutes" ? "minutos" : "segundos");

export function ProductionRunDetail({ run }: { run: ProductionRunDetailData }) {
  const efficiency = calcProductionEfficiency(run);
  const metaPct = efficiency.efficiencyPercentage;
  const tone = efficiencyTone(metaPct);
  const barWidth = metaPct === null ? 0 : Math.min(Math.max(metaPct, 0), 100);
  const productName = run.product?.name ?? run.manualProductName ?? "—";
  const temperatureZones = Array.isArray(run.temperatureZones)
    ? (run.temperatureZones as { label?: string; value?: number }[])
    : [];
  const temperature =
    run.temperatureType === "zones" && temperatureZones.length
      ? temperatureZones.map((z) => `${z.label} ${z.value}°C`).join(" · ")
      : `${run.temperature} °C`;
  const pigmentParts: string[] = [];
  if (run.pigmentQuantity != null) pigmentParts.push(`${run.pigmentQuantity} g`);
  if (run.pigmentColor) pigmentParts.push(run.pigmentColor);
  const pigment = pigmentParts.length ? pigmentParts.join(" · ") : run.pigment ?? "—";
  const coupling =
    run.couplingStatus === "completed"
      ? run.couplingTime
        ? `Realizada · ${run.couplingTime}`
        : "Realizada"
      : run.couplingStatus === "na"
        ? "N/A"
        : run.couplingTest ?? "—";
  const rejectionPct = run.produced > 0 ? (run.damaged / run.produced) * 100 : 0;

  return (
    <>
      <div className="rounded-xl bg-[#F8FAFC] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-lg font-black">Orden #{run.orderNumber}</p>
          <p className="text-sm font-semibold text-[#64748B]">
            {fmtDateOnly(run.productionDate, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <p className="mt-1 text-xs text-[#475569]">
          {run.machine.code} · {run.machine.name} — {run.machine.brand} — {run.operator.fullName} —{" "}
          {fmtTimeOnly(run.startTime)} — {fmtTimeOnly(run.endTime)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3">
        <div className={`rounded-xl border border-[#EEF2F7] border-l-4 p-3 ${tone.cardBg} ${tone.border}`}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">Producción</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-lg font-black leading-none">
              {run.produced.toLocaleString("es-CO")}
              <span className="ml-1 text-xs font-bold text-[#94A3B8]">/ {efficiency.expectedPieces.toLocaleString("es-CO")}</span>
            </p>
            {metaPct !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${tone.chip}`}>{metaPct.toFixed(1)}%</span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-[#64748B]">{metaPct === null ? "Sin ciclo definido" : `${Math.round(metaPct)}% de la meta`}</p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E9EDF2]">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${barWidth}%` }} />
          </div>
        </div>
        <SummaryBox
          label="Piezas buenas"
          value={run.summary.goodPieces.toLocaleString("es-CO")}
          sub={`${fmtPct(run.summary.qualityPercentage)} calidad`}
          cardBg="bg-[#F5FCF7]"
          border="border-l-[#16A34A]"
        />
        <SummaryBox
          label="Rechazo"
          value={run.damaged.toLocaleString("es-CO")}
          sub={`${rejectionPct.toFixed(2)}%`}
          cardBg="bg-[#FFF5F5]"
          border="border-l-[#DC2626]"
        />
        <SummaryBox
          label="Calidad"
          value={fmtPct(run.summary.qualityPercentage)}
          sub="Piezas buenas / producidas"
          cardBg="bg-[#F5FCF7]"
          border="border-l-[#16A34A]"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <PrintSection title="Información de producción">
          <PrintRow label="Producto">{productName}</PrintRow>
          <PrintRow label="Material">{run.material}</PrintRow>
          <PrintRow label="Ciclo">{`${run.cycle} ${cycleUnitLabel(run.cycleUnit)}`}</PrintRow>
          <PrintRow label="Producción esperada">{efficiency.expectedPieces.toLocaleString("es-CO")} piezas</PrintRow>
        </PrintSection>

        <PrintSection title="Parámetros de proceso">
          <PrintRow label="Peso de inyección">{`${run.injectionWeight} g`}</PrintRow>
          <PrintRow label="Peso de la vela">{`${run.pieceWeight} g`}</PrintRow>
          <PrintRow label="Temperatura">{temperature}</PrintRow>
          <PrintRow label="Pigmento / Color">{pigment}</PrintRow>
        </PrintSection>

        <PrintSection title="Control de calidad">
          <PrintRow label="Cantidad dañada">{run.damaged.toLocaleString("es-CO")}</PrintRow>
          <PrintRow label="No conformes">{run.nonConforming.toLocaleString("es-CO")}</PrintRow>
          <PrintRow label="Prueba de acople">
            <span className={run.couplingStatus === "completed" ? "text-[#15803D]" : undefined}>{coupling}</span>
          </PrintRow>
          <PrintRow label="% Calidad">{fmtPct(run.summary.qualityPercentage)}</PrintRow>
        </PrintSection>

        <PrintSection title="Observaciones">
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{run.observations || "Sin observaciones."}</p>
          </div>
        </PrintSection>
      </div>
    </>
  );
}

function SummaryBox({
  label,
  value,
  sub,
  cardBg,
  border,
}: {
  label: string;
  value: string;
  sub: string;
  cardBg: string;
  border: string;
}) {
  return (
    <div className={`rounded-xl border border-[#EEF2F7] border-l-4 px-3 py-3 ${cardBg} ${border}`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] text-[#64748B]">{sub}</p>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
      <div className="bg-[#F8FAFC] px-4 py-2.5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function PrintRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#F1F5F9] px-4 py-2">
      <span className="text-xs text-[#64748B]">{label}</span>
      <span className="text-right text-xs font-semibold text-[#1A1A1A]">{children}</span>
    </div>
  );
}

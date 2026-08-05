"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdHealthAndSafety, MdShield, MdSavings, MdFileDownload, MdInfoOutline } from "react-icons/md";

type PeriodRow = { period: string; eps: number; arl: number; pension: number; deducciones: number };

type Contabilidad = {
  range: { from: string; to: string };
  totales: { eps: number; arl: number; pension: number; deducciones: number };
  desprendibles: number;
  conDesglose: number;
  porPeriodo: PeriodRow[];
};

function money(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

export default function ContabilidadPanelPage() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [data, setData] = useState<Contabilidad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestQuery = useRef("");

  const load = useCallback(async () => {
    const query = `from=${from}&to=${to}`;
    latestQuery.current = query;
    setError("");
    const res = await fetch(`/api/rrhh-local/contabilidad?${query}`);
    if (latestQuery.current !== query) return;
    if (res.ok) setData(await res.json());
    else setError("No fue posible cargar la contabilidad");
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Periodo", "EPS", "ARL", "Pensión", "Deducciones totales"],
      ...data.porPeriodo.map((r) => [r.period, String(r.eps), String(r.arl), String(r.pension), String(r.deducciones)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contabilidad-nomina.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Contabilidad</h1>
          <p className="text-xs text-[#64748B]">Aportes legales de nómina (EPS, ARL, Pensión) por periodo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
          <span className="text-xs text-[#94A3B8]">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm" />
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
            <MdFileDownload size={16} /> Exportar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && data.conDesglose < data.desprendibles && (
        <div className="flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
          <MdInfoOutline size={16} className="shrink-0" />
          {data.conDesglose === 0
            ? "Ningún desprendible en este rango tiene desglose de EPS/ARL/Pensión cargado todavía."
            : `${data.desprendibles - data.conDesglose} de ${data.desprendibles} desprendibles no tienen desglose de aportes cargado — los totales de abajo no los incluyen.`}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi value={money(data.totales.eps)} label="EPS" hint="Salud" icon={<MdHealthAndSafety size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
          <Kpi value={money(data.totales.arl)} label="ARL" hint="Riesgos laborales" icon={<MdShield size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
          <Kpi value={money(data.totales.pension)} label="Pensión" hint="Fondo de pensiones" icon={<MdSavings size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Periodo</th>
              <th className="p-3">EPS</th>
              <th className="p-3">ARL</th>
              <th className="p-3">Pensión</th>
              <th className="p-3">Deducciones totales</th>
            </tr>
          </thead>
          <tbody>
            {data?.porPeriodo.map((r) => (
              <tr key={r.period} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                <td className="p-3 font-bold text-[#1A1A1A]">{r.period}</td>
                <td className="p-3 text-[#64748B]">{money(r.eps)}</td>
                <td className="p-3 text-[#64748B]">{money(r.arl)}</td>
                <td className="p-3 text-[#64748B]">{money(r.pension)}</td>
                <td className="p-3 text-[#1A1A1A]">{money(r.deducciones)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.porPeriodo.length === 0 && (
          <p className="p-6 text-sm text-[#94A3B8]">No hay desprendibles en este rango.</p>
        )}
      </div>
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: { value: string; label: string; hint: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-lg font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}

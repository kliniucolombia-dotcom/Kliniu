"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdAssignment, MdEditNote, MdInsights, MdTimer, MdViewList } from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { Empty, Tabs } from "../_components/ops-ui";
import { SkeletonTable } from "../../components/skeleton";
import { WorkOrdersTab } from "./_components/work-orders-tab";
import { OperationsTab } from "./_components/operations-tab";
import { RegisterTab } from "./_components/register-tab";
import { EntriesTab } from "./_components/entries-tab";
import { IndicatorsTab } from "./_components/indicators-tab";
import { jsonError, type Notify, type Options, type Scope } from "./_components/shared";

type Tab = "registrar" | "registros" | "indicadores" | "odts" | "tiempos";

const TABS: { key: Tab; label: string; icon: React.ReactNode; scopes: Scope[] }[] = [
  { key: "registrar", label: "Registrar", icon: <MdEditNote size={16} />, scopes: ["manage", "own"] },
  { key: "registros", label: "Registros", icon: <MdViewList size={16} />, scopes: ["manage", "own", "read"] },
  { key: "indicadores", label: "Indicadores", icon: <MdInsights size={16} />, scopes: ["manage", "own", "read"] },
  { key: "odts", label: "ODTs", icon: <MdAssignment size={16} />, scopes: ["manage", "read"] },
  { key: "tiempos", label: "Tiempos estándar", icon: <MdTimer size={16} />, scopes: ["manage", "read"] },
];

export default function ControlProduccionPage() {
  const [options, setOptions] = useState<Options | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("registrar");
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Solo la primera carga reemplaza la pantalla por el error; en recargas se avisa y se conservan los datos.
  const loaded = useRef(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/control-produccion/options");
      if (r.ok) { setOptions(await r.json()); setError(null); loaded.current = true; return; }
      const msg = r.status === 401 || r.status === 403 ? "No tienes acceso a este módulo." : await jsonError(r, "No fue posible cargar el módulo");
      if (loaded.current) setAlert({ type: "err", msg }); else setError(msg);
    } catch {
      if (loaded.current) setAlert({ type: "err", msg: "Error de conexión" }); else setError("Error de conexión");
    }
  }, []);

  useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const notify: Notify = useCallback((type, msg) => setAlert({ type, msg }), []);
  const tabs = options
    ? TABS.filter((t) => t.scopes.includes(options.scope)).map((t) => (options.scope !== "own" ? t : t.key === "registros" ? { ...t, label: "Mis registros" } : t.key === "indicadores" ? { ...t, label: "Mi eficiencia" } : t))
    : [];
  const current = tabs.find((t) => t.key === tab)?.key ?? tabs[0]?.key;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Control de Producción</h1>
        <p className="mt-1 text-sm text-[#64748B]">Planta de ensamble y empaque: ODTs, tiempos estándar y registro por operario.</p>
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>
      )}

      {error ? <Empty text={error} /> : !options ? <SkeletonTable /> : tabs.length === 0 ? (
        <Empty text="Aún no hay nada para registrar aquí." />
      ) : (
        <>
          <Tabs tabs={tabs} value={current!} onChange={setTab} />
          {current === "registrar" && <RegisterTab options={options} notify={notify} onChanged={load} />}
          {current === "registros" && <EntriesTab options={options} notify={notify} />}
          {current === "indicadores" && <IndicatorsTab options={options} notify={notify} />}
          {current === "odts" && <WorkOrdersTab options={options} notify={notify} onChanged={load} />}
          {current === "tiempos" && <OperationsTab options={options} notify={notify} onChanged={load} />}
        </>
      )}
    </div>
  );
}

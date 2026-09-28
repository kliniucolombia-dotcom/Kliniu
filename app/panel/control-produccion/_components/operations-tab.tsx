"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdSearch } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { addDays } from "@/lib/commercial-calendar";
import { SimpleSelect } from "../../_components/simple-select";
import { Empty, Footer, Modal, Section, Table, btnGhost, btnPrimary, inputCls, labelCls, patchReq, post } from "../../_components/ops-ui";
import { SkeletonTable } from "../../../components/skeleton";
import { SuggestInput, fmtStdMinutes, jsonError, normalize, type Notify, type Options } from "./shared";

type Operation = {
  id: string; code: string; name: string; family: string; standardSeconds: number; isActive: boolean;
  _count: { entries: number };
};
type Form = { id?: string; code: string; name: string; family: string; standardSeconds: string };

export function OperationsTab({ options, notify, onChanged }: { options: Options; notify: Notify; onChanged: () => void }) {
  const confirm = useConfirm();
  const canManage = options.permission.canEdit;
  const [operations, setOperations] = useState<Operation[] | null>(null);
  const [family, setFamily] = useState("all");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // Tiempo real promedio de los últimos 30 días por operación (de los indicadores), para recalibrar.
  const [real, setReal] = useState<Map<string, number | null>>(new Map());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/panel/control-produccion/operations");
      if (r.ok) { setOperations((await r.json()).operations); setFailed(false); return; }
      notify("err", await jsonError(r, "No fue posible cargar las operaciones"));
    } catch {
      notify("err", "Error de conexión");
    }
    setFailed(true);
  }, [notify]);

  const loadReal = useCallback(async () => {
    const r = await fetch(`/api/panel/control-produccion/indicators?from=${addDays(options.today, -29)}&to=${options.today}`).catch(() => null);
    if (!r?.ok) return;
    const body: { byOperation: { id: string; realSecondsPerUnit: number | null }[] } = await r.json();
    setReal(new Map(body.byOperation.map((o) => [o.id, o.realSecondsPerUnit])));
  }, [options.today]);
  useEffect(() => {
    const task = window.setTimeout(() => void loadReal(), 0);
    return () => window.clearTimeout(task);
  }, [loadReal]);

  const { markLocalWrite } = useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const families = useMemo(() => [...new Set((operations ?? []).map((o) => o.family))].sort(), [operations]);
  const visible = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    return (operations ?? []).filter((o) => {
      if (family !== "all" && o.family !== family) return false;
      const text = normalize(`${o.code} ${o.name} ${o.family}`);
      return words.every((w) => text.includes(w));
    });
  }, [operations, family, q]);

  const refresh = () => { load(); onChanged(); };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    markLocalWrite();
    const body = { code: form.code, name: form.name, family: form.family, standardSeconds: Number(form.standardSeconds) };
    const res = await (form.id ? patchReq(`/api/panel/control-produccion/operations/${form.id}`, body) : post("/api/panel/control-produccion/operations", body))
      .catch(() => ({ ok: false, error: "Error de conexión" }))
      .finally(() => setSaving(false));
    if (!res.ok) return notify("err", res.error ?? "No fue posible guardar la operación");
    notify("ok", form.id ? `Operación ${form.code.toUpperCase()} actualizada` : `Operación ${form.code.toUpperCase()} creada`);
    setForm(null);
    refresh();
  };

  const toggle = async (o: Operation) => {
    markLocalWrite();
    const res = await patchReq(`/api/panel/control-produccion/operations/${o.id}`, { isActive: !o.isActive }).catch(() => ({ ok: false, error: "Error de conexión" }));
    if (!res.ok) return notify("err", res.error ?? "No fue posible actualizar la operación");
    refresh();
  };

  const remove = async (o: Operation) => {
    if (!(await confirm({ title: "Eliminar operación", message: `¿Eliminar ${o.code} · ${o.name}?` }))) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/control-produccion/operations/${o.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return notify("err", r ? await jsonError(r, "No fue posible eliminar la operación") : "Error de conexión");
    notify("ok", `Operación ${o.code} eliminada`);
    refresh();
  };

  const seconds = Number(form?.standardSeconds);
  const valid = form && form.code.trim() && form.name.trim() && form.family.trim() && form.standardSeconds.trim() !== "" && seconds >= 0;

  return (
    <Section
      title={`Tiempos estándar (${visible.length})`}
      action={canManage && <button className={btnPrimary} onClick={() => setForm({ code: "", name: "", family: family === "all" ? "" : family, standardSeconds: "" })}><MdAdd size={16} />Nueva operación</button>}
    >
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="w-60">
          <label className={labelCls}>Familia de producto</label>
          <SimpleSelect value={family} searchable portal
            options={[{ value: "all", label: "Todas" }, ...families.map((f) => ({ value: f, label: f }))]}
            onChange={setFamily} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className={labelCls}>Buscar</label>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código u operación" className={`${inputCls} pl-9`} />
          </div>
        </div>
      </div>

      {!operations ? (failed ? (
        <div className="space-y-2 text-center">
          <Empty text="No fue posible cargar las operaciones." />
          <button className={btnGhost} onClick={() => load()}>Reintentar</button>
        </div>
      ) : <SkeletonTable />) : (
        <Table
          head={["Código", "Operación", "Familia", "Estándar", "Real (30 días)", "Registros", "Estado", canManage ? "" : null]}
          rows={visible.map((o) => [
            <b key="c">{o.code}</b>,
            o.name,
            o.family,
            o.standardSeconds === 0
              ? <span key="t" className="text-[#94A3B8]">Indirecta</span>
              : <span key="t">{fmtStdMinutes(o.standardSeconds)}<span className="block text-[11px] text-[#94A3B8]">{o.standardSeconds} seg/und</span></span>,
            real.get(o.id) != null
              ? <span key="r">{fmtStdMinutes(real.get(o.id)!)}<span className="block text-[11px] text-[#94A3B8]">{Math.round(real.get(o.id)!)} seg/und</span></span>
              : <span key="r" className="text-[#94A3B8]">—</span>,
            String(o._count.entries),
            canManage
              ? <button key="s" onClick={() => toggle(o)} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${o.isActive ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{o.isActive ? "Activa" : "Inactiva"}</button>
              : <span key="s" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${o.isActive ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{o.isActive ? "Activa" : "Inactiva"}</span>,
            canManage ? (
              <div key="a" className="flex justify-end gap-1">
                <button onClick={() => setForm({ id: o.id, code: o.code, name: o.name, family: o.family, standardSeconds: String(o.standardSeconds) })} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Editar operación"><MdEdit size={16} /></button>
                {options.permission.canDelete && (
                  <button onClick={() => remove(o)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]" aria-label="Eliminar operación"><MdDelete size={16} /></button>
                )}
              </div>
            ) : null,
          ])}
          empty="Sin operaciones. Carga las de la hoja TIEMPOS con “Nueva operación”."
        />
      )}

      {form && (
        <Modal title={form.id ? `Editar ${form.code}` : "Nueva operación"} onClose={() => setForm(null)}
          footer={<Footer onClose={() => setForm(null)} onSubmit={save} disabled={!valid} submitting={saving} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Código</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="JB5-04" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Familia de producto</label>
              <SuggestInput value={form.family} uppercase placeholder="DSP JB 500"
                onChange={(v) => setForm({ ...form, family: v })}
                suggestions={families} toText={(f) => f} render={(f) => f}
                onPick={(f) => setForm({ ...form, family: f })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Operación</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })} placeholder="EMSAMBLAR ACCESORIO" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tiempo estándar (segundos por unidad)</label>
            <input type="number" min={0} step="0.1" value={form.standardSeconds} onChange={(e) => setForm({ ...form, standardSeconds: e.target.value })} className={`no-spinner ${inputCls}`} />
            <p className="mt-1 text-xs text-[#94A3B8]">
              {form.standardSeconds.trim() === "" || !(seconds >= 0) ? "0 = operación indirecta (aseo, reunión): no cuenta para eficiencia."
                : seconds === 0 ? "Indirecta: no cuenta para eficiencia."
                : `${fmtStdMinutes(seconds)} por unidad.`}
            </p>
          </div>
          {form.id && <p className="text-xs text-[#94A3B8]">Cambiar el estándar no modifica los registros ya hechos: cada registro guarda el estándar con el que se hizo.</p>}
        </Modal>
      )}
    </Section>
  );
}

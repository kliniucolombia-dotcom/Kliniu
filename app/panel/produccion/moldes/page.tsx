"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAdd, MdSwapHoriz, MdTimer, MdPrecisionManufacturing, MdStopCircle, MdInventory2 } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";
import {
  fmtDate, fmtDateTime, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Badge, Tabs, DateRange,
} from "../../_components/ops-ui";

type MoldStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";
type Mold = { id: string; code: string; name: string; status: MoldStatus; _count: { changes: number } };
type Machine = { id: string; code: number; name: string; brand: string };
type Change = {
  id: string; startedAt: string; finishedAt: string | null; notes: string | null;
  machine: { id: string; code: number; name: string };
  mold: { id: string; code: string; name: string };
  changedBy: { fullName: string };
};
type Kpis = { changesCompleted: number; avgChangeMinutes: number; totalChangeMinutes: number; openChanges: number; moldsInUse: number; moldsTotal: number };
type Data = { molds: Mold[]; machines: Machine[]; changes: Change[]; kpis: Kpis; permission: Permission };

const MOLD_STATUS: Record<MoldStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: "Disponible", cls: "bg-[#DCFCE7] text-[#15803D]" },
  IN_USE: { label: "Montado", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  MAINTENANCE: { label: "En mantenimiento", cls: "bg-[#FEF3C7] text-[#B45309]" },
};

type Tab = "cambios" | "moldes";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "cambios", label: "Cambios de molde", icon: <MdSwapHoriz size={16} /> },
  { key: "moldes", label: "Moldes", icon: <MdInventory2 size={16} /> },
];

function fmtMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
function closedDuration(c: Change & { finishedAt: string }) {
  return Math.max(0, Math.round((new Date(c.finishedAt).getTime() - new Date(c.startedAt).getTime()) / 60000));
}

export default function MoldesPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cambios");
  const [from, setFrom] = useState(todayBogota(-7));
  const [to, setTo] = useState(todayBogota());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<{ kind: "mold" } | { kind: "mount" } | { kind: "finish"; change: Change } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/panel/produccion/moldes?from=${from}&to=${to}`);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (!r.ok) { setAlert({ type: "err", msg: (await r.json()).error ?? "Error al cargar" }); setLoading(false); return; }
    setData(await r.json());
    setLoading(false);
  }, [from, to, router]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const perm = data?.permission ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });
  async function patch(url: string, body: unknown, okMsg: string) {
    const res = await patchReq(url, body);
    if (res.ok) { setAlert({ type: "ok", msg: okMsg }); load(); } else fail(res.error!);
  }

  const openChanges = useMemo(() => (data?.changes ?? []).filter((c) => !c.finishedAt), [data]);
  const closedChanges = useMemo(
    () => (data?.changes ?? []).filter((c): c is Change & { finishedAt: string } => c.finishedAt !== null),
    [data],
  );
  const availableMolds = useMemo(() => (data?.molds ?? []).filter((m) => m.status === "AVAILABLE"), [data]);
  const freeMachines = useMemo(() => {
    const busy = new Set(openChanges.map((c) => c.machine.id));
    return (data?.machines ?? []).filter((m) => !busy.has(m.id));
  }, [data, openChanges]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones · Producción</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Moldes y cambios de molde</h1>
          <p className="mt-1 text-sm text-[#64748B]">Montaje y desmontaje por máquina, con el tiempo real de cada cambio.</p>
        </div>
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MdSwapHoriz size={18} />} label="Cambios completados" value={String(data.kpis.changesCompleted)} color="#27B1B8" />
          <Kpi icon={<MdTimer size={18} />} label="Tiempo promedio de cambio" value={fmtMinutes(data.kpis.avgChangeMinutes)} color="#F0A73C" />
          <Kpi icon={<MdPrecisionManufacturing size={18} />} label="Moldes montados" value={`${data.kpis.moldsInUse} / ${data.kpis.moldsTotal}`} color="#7C6CE0" />
          <Kpi icon={<MdStopCircle size={18} />} label="Montajes sin cerrar" value={String(data.kpis.openChanges)} color="#DC2626" />
        </div>
      )}

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {loading || !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : tab === "cambios" ? (
        <div className="space-y-8">
          <Section
            title={`Moldes montados (${openChanges.length})`}
            action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "mount" })} disabled={availableMolds.length === 0 || freeMachines.length === 0}><MdAdd size={16} />Montar molde</button>}
          >
            {data.molds.length === 0 && <p className="mb-3 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#B45309]">Registra primero los moldes en la pestaña Moldes.</p>}
            {openChanges.length === 0 ? <Empty text="Ninguna máquina tiene molde montado." /> : (
              <div className="space-y-3">
                {openChanges.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-black text-[#1A1A1A]">Máquina #{c.machine.code} · {c.machine.name}</p>
                      <p className="mt-1 text-sm text-[#1A1A1A]">Molde {c.mold.code} — {c.mold.name}</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">Montado {fmtDateTime(c.startedAt)} por {c.changedBy.fullName}</p>
                      {c.notes && <p className="mt-1 text-xs text-[#64748B]">{c.notes}</p>}
                    </div>
                    {perm.canEdit && <button className={btnPrimary} onClick={() => setModal({ kind: "finish", change: c })}><MdStopCircle size={16} />Desmontar</button>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`Historial de cambios (${closedChanges.length})`}>
            <Table
              head={["Máquina", "Molde", "Montaje", "Desmontaje", "Duración", "Responsable", "Notas"]}
              rows={closedChanges.map((c) => [
                `#${c.machine.code} · ${c.machine.name}`, `${c.mold.code} — ${c.mold.name}`,
                fmtDateTime(c.startedAt), fmtDateTime(c.finishedAt),
                <b key="d">{fmtMinutes(closedDuration(c))}</b>, c.changedBy.fullName, c.notes ?? "—",
              ])}
              empty="Sin cambios de molde cerrados en este período."
            />
          </Section>
        </div>
      ) : (
        <Section
          title="Moldes"
          action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "mold" })}><MdAdd size={16} />Nuevo molde</button>}
        >
          <Table
            head={["Código", "Nombre", "Estado", "Cambios", perm.canEdit ? "" : null]}
            rows={data.molds.map((m) => [
              <b key="c">{m.code}</b>, m.name, <Badge key="s" {...MOLD_STATUS[m.status]} />, String(m._count.changes),
              perm.canEdit && m.status !== "IN_USE" ? (
                <button key="a" className={btnGhost} onClick={() => patch(`/api/panel/produccion/moldes/${m.id}`, { status: m.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE" }, m.status === "MAINTENANCE" ? "Molde disponible" : "Molde enviado a mantenimiento")}>
                  {m.status === "MAINTENANCE" ? "Marcar disponible" : "Enviar a mantenimiento"}
                </button>
              ) : null,
            ])}
            empty="Sin moldes registrados."
          />
        </Section>
      )}

      {modal?.kind === "mold" && <MoldModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "mount" && data && <MountModal molds={availableMolds} machines={freeMachines} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "finish" && <FinishModal change={modal.change} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

function MoldModal({ onClose, onDone, onError }: ModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/produccion/moldes", { code, name });
    setSubmitting(false);
    if (res.ok) onDone("Molde registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo molde" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!code.trim() || !name.trim()} />}>
      <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="MOL-01" /></div>
      <div><label className={labelCls}>Nombre / referencia</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function MountModal({ molds, machines, onClose, onDone, onError }: ModalProps & { molds: Mold[]; machines: Machine[] }) {
  const [machineId, setMachineId] = useState(machines[0]?.id ?? "");
  const [moldId, setMoldId] = useState(molds[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/produccion/moldes/cambios", { machineId, moldId, notes });
    setSubmitting(false);
    if (res.ok) onDone("Montaje registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Montar molde" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!machineId || !moldId} />}>
      <p className="text-xs text-[#64748B]">El cronómetro del cambio arranca al confirmar y se cierra al desmontar.</p>
      <div><label className={labelCls}>Máquina (solo las libres)</label><SimpleSelect value={machineId} options={machines.map((m) => ({ value: m.id, label: `#${m.code} · ${m.name}` }))} onChange={setMachineId} /></div>
      <div><label className={labelCls}>Molde disponible</label><SimpleSelect value={moldId} options={molds.map((m) => ({ value: m.id, label: `${m.code} — ${m.name}` }))} onChange={setMoldId} /></div>
      <div><label className={labelCls}>Notas (opcional)</label><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function FinishModal({ change, onClose, onDone, onError }: ModalProps & { change: Change }) {
  const [notes, setNotes] = useState(change.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/produccion/moldes/cambios/${change.id}`, { notes });
    setSubmitting(false);
    if (res.ok) onDone("Molde desmontado"); else onError(res.error!);
  };
  return (
    <Modal title={`Desmontar ${change.mold.code} de #${change.machine.code}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} />}>
      <p className="text-sm text-[#64748B]">Montado el {fmtDateTime(change.startedAt)} ({fmtDate(change.startedAt)}).</p>
      <div><label className={labelCls}>Notas del cambio (opcional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Novedades del montaje/desmontaje…" /></div>
    </Modal>
  );
}

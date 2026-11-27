"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MdAdd, MdSwapHoriz, MdTimer, MdPrecisionManufacturing, MdStopCircle, MdInventory2, MdDeleteOutline, MdEdit } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";
import { PhotoField } from "../../_components/photo-field";
import { useConfirm } from "@/app/components/confirm-dialog";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import {
  fmtDate, fmtDateTime, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Badge, Tabs, DateRange,
} from "../../_components/ops-ui";
import { SkeletonTable } from "../../../components/skeleton";

type MoldStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE";
type MoldProcess = "INJECTION" | "BLOW";
type Mold = {
  id: string; code: string; name: string; status: MoldStatus; _count: { changes: number };
  process: MoldProcess | null; material: string | null; manufacturedAt: string | null; cavities: number | null;
  pieceNames: string | null; expectedCycleSec: number | null; dimensions: string | null; weightKg: number | null; photoUrl: string | null;
};
const MOLD_PROCESS: Record<MoldProcess, string> = { INJECTION: "Inyección", BLOW: "Soplado" };
type Machine = { id: string; code: number; name: string; brand: string };
type Change = {
  id: string; startedAt: string; finishedAt: string | null; notes: string | null;
  machine: { id: string; code: number; name: string };
  mold: { id: string; code: string; name: string };
  changedBy: { fullName: string };
};
type Kpis = { changesCompleted: number; avgChangeMinutes: number; totalChangeMinutes: number; openChanges: number; moldsInUse: number; moldsTotal: number };
type Data = { molds: Mold[]; machines: Machine[]; changes: Change[]; kpis: Kpis; permission: Permission; canManageChanges: boolean; canEditMolds: boolean };

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

// Bogotá es UTC-5 todo el año: convierte entre ISO y el valor de <input type="datetime-local">.
function toBogotaInput(iso: string) {
  return new Date(new Date(iso).getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
}
function fromBogotaInput(value: string) {
  return new Date(`${value.length === 16 ? `${value}:00` : value}-05:00`).toISOString();
}

export default function MoldesPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("cambios");
  const [from, setFrom] = useState(todayBogota(-7));
  const [to, setTo] = useState(todayBogota());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<
    | { kind: "mold"; mold?: Mold }
    | { kind: "mount" }
    | { kind: "finish"; change: Change }
    | { kind: "editChange"; change: Change }
    | null
  >(null);
  const [deletingChangeId, setDeletingChangeId] = useState<string | null>(null);
  const [deletingMoldId, setDeletingMoldId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    const r = await fetch(`/api/panel/produccion/moldes?from=${from}&to=${to}`);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (!r.ok) { setAlert({ type: "err", msg: (await r.json()).error ?? "Error al cargar" }); setLoading(false); return; }
    setData(await r.json());
    setLoading(false);
  }, [from, to, router]);

  const { markLocalWrite } = useRealtimeRefresh(["production"], load);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const perm = data?.permission ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });
  async function patch(url: string, body: unknown, okMsg: string) {
    markLocalWrite();
    const res = await patchReq(url, body);
    if (res.ok) { setAlert({ type: "ok", msg: okMsg }); load(); } else fail(res.error!);
  }

  async function deleteChange(c: Change) {
    const ok = await confirm({
      title: "Eliminar cambio de molde",
      message: `Se eliminará del historial el cambio de ${c.mold.code} — ${c.mold.name} en #${c.machine.code} · ${c.machine.name} (${fmtDateTime(c.startedAt)}). Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeletingChangeId(c.id);
    markLocalWrite();
    const r = await fetch(`/api/panel/produccion/moldes/cambios/${c.id}`, { method: "DELETE" });
    setDeletingChangeId(null);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setAlert({ type: "err", msg: d?.error ?? "No se pudo eliminar el cambio." });
      return;
    }
    setAlert({ type: "ok", msg: "Cambio de molde eliminado" });
    load();
  }

  async function deleteMoldRecord(m: Mold) {
    const ok = await confirm({
      title: "Eliminar molde",
      message: `Se eliminará el molde ${m.code} — ${m.name}${m._count.changes > 0 ? ` y sus ${m._count.changes} cambio${m._count.changes === 1 ? "" : "s"} de historial` : ""}. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      danger: true,
    });
    if (!ok) return;
    setDeletingMoldId(m.id);
    markLocalWrite();
    const r = await fetch(`/api/panel/produccion/moldes/${m.id}`, { method: "DELETE" });
    setDeletingMoldId(null);
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      setAlert({ type: "err", msg: d?.error ?? "No se pudo eliminar el molde." });
      return;
    }
    setAlert({ type: "ok", msg: "Molde eliminado" });
    load();
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
        <SkeletonTable />
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
              head={["Máquina", "Molde", "Montaje", "Desmontaje", "Duración", "Responsable", "Notas", data.canManageChanges ? "" : null]}
              rows={closedChanges.map((c) => [
                `#${c.machine.code} · ${c.machine.name}`, `${c.mold.code} — ${c.mold.name}`,
                fmtDateTime(c.startedAt), fmtDateTime(c.finishedAt),
                <b key="d">{fmtMinutes(closedDuration(c))}</b>, c.changedBy.fullName, c.notes ?? "—",
                data.canManageChanges ? (
                  <div key="actions" className="flex items-center gap-1.5">
                    <button
                      onClick={() => setModal({ kind: "editChange", change: c })}
                      title="Editar cambio de molde"
                      aria-label="Editar cambio de molde"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:bg-[#F1F5F9]"
                    >
                      <MdEdit size={15} />
                    </button>
                    <button
                      onClick={() => deleteChange(c)}
                      disabled={deletingChangeId === c.id}
                      title="Eliminar cambio de molde"
                      aria-label="Eliminar cambio de molde"
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] transition-colors hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MdDeleteOutline size={15} />
                    </button>
                  </div>
                ) : null,
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
            head={["Código", "Nombre", "Tipo", "Pieza(s)", "Cavidades", "Ciclo", "Estado", "Cambios", perm.canEdit || data.canEditMolds ? "" : null]}
            rows={data.molds.map((m) => [
              <div key="c" className="flex items-center gap-2">
                {m.photoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <a href={m.photoUrl} target="_blank" rel="noopener noreferrer"><img src={m.photoUrl} alt={`Foto del molde ${m.code}`} className="h-9 w-9 shrink-0 rounded-lg border border-[#E2E8F0] object-cover" /></a>
                  : null}
                <b>{m.code}</b>
              </div>, m.name, m.process ? MOLD_PROCESS[m.process] : "—", m.pieceNames ?? "—",
              m.cavities != null ? String(m.cavities) : "—", m.expectedCycleSec != null ? `${m.expectedCycleSec} s` : "—",
              <Badge key="s" {...MOLD_STATUS[m.status]} />, String(m._count.changes),
              <div key="a" className="flex flex-wrap items-center gap-1.5">
                {perm.canEdit && m.status !== "IN_USE" && (
                  <button className={btnGhost} onClick={() => patch(`/api/panel/produccion/moldes/${m.id}`, { status: m.status === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE" }, m.status === "MAINTENANCE" ? "Molde disponible" : "Molde enviado a mantenimiento")}>
                    {m.status === "MAINTENANCE" ? "Marcar disponible" : "Enviar a mantenimiento"}
                  </button>
                )}
                {data.canEditMolds && (
                  <button
                    onClick={() => setModal({ kind: "mold", mold: m })}
                    title="Editar molde"
                    aria-label="Editar molde"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] transition-colors hover:bg-[#F1F5F9]"
                  >
                    <MdEdit size={15} />
                  </button>
                )}
                {data.canManageChanges && (
                  <button
                    onClick={() => deleteMoldRecord(m)}
                    disabled={deletingMoldId === m.id || m.status === "IN_USE"}
                    title={m.status === "IN_USE" ? "Desmonta el molde antes de eliminarlo" : "Eliminar molde"}
                    aria-label="Eliminar molde"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] transition-colors hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MdDeleteOutline size={15} />
                  </button>
                )}
              </div>,
            ])}
            empty="Sin moldes registrados."
          />
        </Section>
      )}

      {modal?.kind === "mold" && <MoldModal mold={modal.mold} markLocalWrite={markLocalWrite} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "mount" && data && <MountModal markLocalWrite={markLocalWrite} molds={availableMolds} machines={freeMachines} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "finish" && <FinishModal markLocalWrite={markLocalWrite} change={modal.change} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "editChange" && <EditChangeModal markLocalWrite={markLocalWrite} change={modal.change} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

function MoldModal({ mold, onClose, onDone, onError, markLocalWrite }: ModalProps & { mold?: Mold; markLocalWrite: () => void }) {
  const editing = Boolean(mold);
  const [code, setCode] = useState(mold?.code ?? "");
  const [name, setName] = useState(mold?.name ?? "");
  const [process, setProcess] = useState<string>(mold?.process ?? "");
  const [material, setMaterial] = useState(mold?.material ?? "");
  const [manufacturedAt, setManufacturedAt] = useState(mold?.manufacturedAt?.slice(0, 10) ?? "");
  const [cavities, setCavities] = useState(mold?.cavities?.toString() ?? "");
  const [pieceNames, setPieceNames] = useState(mold?.pieceNames ?? "");
  const [cycle, setCycle] = useState(mold?.expectedCycleSec?.toString() ?? "");
  const [dimensions, setDimensions] = useState(mold?.dimensions ?? "");
  const [weight, setWeight] = useState(mold?.weightKg?.toString() ?? "");
  const [photoUrl, setPhotoUrl] = useState(mold?.photoUrl ?? "");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const body = {
      code, name, process: process || null, material, manufacturedAt: manufacturedAt || null,
      cavities: cavities || null, pieceNames, expectedCycleSec: cycle.replace(",", ".") || null,
      dimensions, weightKg: weight.replace(",", ".") || null, photoUrl: photoUrl || null,
    };
    const res = editing
      ? await patchReq(`/api/panel/produccion/moldes/${mold!.id}`, body)
      : await post("/api/panel/produccion/moldes", body);
    setSubmitting(false);
    if (res.ok) onDone(editing ? "Molde actualizado" : "Molde registrado"); else onError(res.error!);
  };
  return (
    <Modal wide title={editing ? `Editar molde ${mold!.code}` : "Nuevo molde"} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!code.trim() || !name.trim()} />}>
      <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="MOL-01" /></div>
      <div><label className={labelCls}>Nombre / referencia</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className={labelCls}>Tipo</label><SimpleSelect value={process} options={[{ value: "", label: "Sin definir" }, { value: "INJECTION", label: "Inyección" }, { value: "BLOW", label: "Soplado" }]} onChange={setProcess} /></div>
        <div><label className={labelCls}>Material del molde</label><input value={material} onChange={(e) => setMaterial(e.target.value)} className={inputCls} placeholder="Acero P20, aluminio…" /></div>
        <div><label className={labelCls}>Fecha de fabricación</label><input type="date" value={manufacturedAt} onChange={(e) => setManufacturedAt(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>No. de cavidades</label><input type="number" min={1} step={1} inputMode="numeric" value={cavities} onChange={(e) => setCavities(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Ciclo esperado (segundos)</label><input type="number" min={0} step="any" inputMode="decimal" value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Peso del molde (kg)</label><input type="number" min={0} step="any" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Nombre(s) de la pieza</label><input value={pieceNames} onChange={(e) => setPieceNames(e.target.value)} className={inputCls} placeholder="Separa varias con coma" /></div>
      <div><label className={labelCls}>Medidas</label><input value={dimensions} onChange={(e) => setDimensions(e.target.value)} className={inputCls} placeholder="40 x 30 x 25 cm" /></div>
      <div><label className={labelCls}>Foto del molde (opcional)</label><PhotoField uploadUrl="/api/panel/produccion/moldes/upload" alt="Foto del molde" value={photoUrl} onChange={setPhotoUrl} onError={onError} /></div>
    </Modal>
  );
}

function MountModal({ molds, machines, onClose, onDone, onError, markLocalWrite }: ModalProps & { molds: Mold[]; machines: Machine[]; markLocalWrite: () => void }) {
  const [machineId, setMachineId] = useState(machines[0]?.id ?? "");
  const [moldId, setMoldId] = useState(molds[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
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

function FinishModal({ change, onClose, onDone, onError, markLocalWrite }: ModalProps & { change: Change; markLocalWrite: () => void }) {
  const [notes, setNotes] = useState(change.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
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

function EditChangeModal({ change, onClose, onDone, onError, markLocalWrite }: ModalProps & { change: Change; markLocalWrite: () => void }) {
  const [startedAt, setStartedAt] = useState(toBogotaInput(change.startedAt));
  const [finishedAt, setFinishedAt] = useState(change.finishedAt ? toBogotaInput(change.finishedAt) : "");
  const [notes, setNotes] = useState(change.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const rangeValid = Boolean(startedAt && finishedAt && finishedAt > startedAt);

  const submit = async () => {
    if (!rangeValid) {
      onError("El desmontaje debe ser posterior al montaje.");
      return;
    }
    setSubmitting(true);
    markLocalWrite();
    const r = await fetch(`/api/panel/produccion/moldes/cambios/${change.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: fromBogotaInput(startedAt),
        finishedAt: fromBogotaInput(finishedAt),
        notes,
      }),
    });
    const d = await r.json().catch(() => null);
    setSubmitting(false);
    if (r.ok) onDone("Cambio de molde actualizado");
    else onError(d?.error ?? "No se pudo actualizar el cambio.");
  };

  return (
    <Modal
      title={`Editar cambio · ${change.mold.code} en #${change.machine.code}`}
      onClose={onClose}
      footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!rangeValid} />}
    >
      <p className="text-xs text-[#64748B]">
        {change.mold.code} — {change.mold.name} · {change.machine.name}. Responsable registrado: {change.changedBy.fullName}.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Montaje</label>
          <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Desmontaje</label>
          <input type="datetime-local" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} className={inputCls} />
        </div>
      </div>
      {!rangeValid && <p className="text-xs font-semibold text-[#DC2626]">El desmontaje debe ser posterior al montaje.</p>}
      <div><label className={labelCls}>Notas del cambio (opcional)</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="Novedades del montaje/desmontaje…" /></div>
    </Modal>
  );
}

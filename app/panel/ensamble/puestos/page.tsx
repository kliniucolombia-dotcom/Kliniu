"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MdAdd, MdArrowBack, MdDelete, MdEdit } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";

type Station = { id: string; code: number; name: string; location: string | null; isActive: boolean };

const inputCls = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";
const labelCls = "mb-1 block text-xs font-semibold text-[#64748B]";

export default function PuestosEnsamblePage() {
  const confirm = useConfirm();
  const [stations, setStations] = useState<Station[]>([]);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<{ id?: string; code: string; name: string; location: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/panel/assembly-stations");
    if (r.ok) setStations((await r.json()).stations ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    const payload = { code: Number(modal.code), name: modal.name, location: modal.location || null };
    const r = modal.id
      ? await fetch(`/api/panel/assembly-stations/${modal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/panel/assembly-stations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (r.ok) {
      setModal(null);
      setAlert({ type: "ok", msg: modal.id ? "Puesto actualizado" : "Puesto creado" });
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      setAlert({ type: "err", msg: d.error ?? "No fue posible guardar el puesto" });
    }
  };

  const toggleActive = async (station: Station) => {
    const r = await fetch(`/api/panel/assembly-stations/${station.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !station.isActive }),
    });
    if (r.ok) load();
  };

  const remove = async (station: Station) => {
    const ok = await confirm({ title: "Eliminar puesto", message: `¿Eliminar el puesto ${station.name}?` });
    if (!ok) return;
    const r = await fetch(`/api/panel/assembly-stations/${station.id}`, { method: "DELETE" });
    if (r.ok) {
      setAlert({ type: "ok", msg: "Puesto eliminado" });
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      setAlert({ type: "err", msg: d.error ?? "No fue posible eliminar el puesto" });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <Link href="/panel/ensamble" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#64748B] hover:text-[#1A1A1A]">
        <MdArrowBack size={16} /> Ensamble
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A]">Puestos de ensamble</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Mesas o líneas donde se registra el ensamble</p>
        </div>
        <button onClick={() => setModal({ code: "", name: "", location: "" })} className="inline-flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-3.5 py-2 text-sm font-bold text-white hover:opacity-80">
          <MdAdd size={16} /> Nuevo puesto
        </button>
      </div>

      {alert && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
          {alert.msg}
        </div>
      )}

      <div className="min-w-0 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => (
              <tr key={station.id} className="border-b border-[#F1F5F9]">
                <td className="px-4 py-3 font-bold text-[#1A1A1A]">{station.code}</td>
                <td className="px-4 py-3 text-[#1A1A1A]">{station.name}</td>
                <td className="px-4 py-3 text-[#64748B]">{station.location ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(station)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${station.isActive ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}
                  >
                    {station.isActive ? "Activo" : "Inactivo"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setModal({ id: station.id, code: String(station.code), name: station.name, location: station.location ?? "" })} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Editar puesto">
                      <MdEdit size={16} />
                    </button>
                    <button onClick={() => remove(station)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]" aria-label="Eliminar puesto">
                      <MdDelete size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {stations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#94A3B8]">Sin puestos todavía. Crea el primero.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-black text-[#1A1A1A]">{modal.id ? "Editar puesto" : "Nuevo puesto"}</h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Código</label>
                <input type="number" min={1} value={modal.code} onChange={(e) => setModal({ ...modal, code: e.target.value })} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Nombre</label>
                <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ubicación (opcional)</label>
                <input value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })} placeholder="Planta ensamble…" className={inputCls} />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={save} disabled={saving || !modal.name.trim() || !modal.code} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

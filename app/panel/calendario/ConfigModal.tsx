"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MdClose, MdAdd, MdDeleteOutline } from "react-icons/md";

type SellerCfg = { id: string; name: string; workDays: number[]; active: boolean };
type Holiday = { date: string; label: string };

const DAYS = [
  { n: 1, l: "L" }, { n: 2, l: "M" }, { n: 3, l: "X" }, { n: 4, l: "J" }, { n: 5, l: "V" }, { n: 6, l: "S" }, { n: 0, l: "D" },
];

const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fromTime = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

const input = "rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#334155] outline-none focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/15";

export default function ConfigModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState("20:00");
  const [start, setStart] = useState("");
  const [sellers, setSellers] = useState<SellerCfg[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hDate, setHDate] = useState("");
  const [hLabel, setHLabel] = useState("");

  useEffect(() => {
    fetch("/api/panel/calendar/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setDeadline(toTime(d.deadlineMinutes));
        setStart(d.trackingStartDate);
        setSellers(d.sellers);
        setHolidays(d.holidays);
      })
      .catch(() => setError("No se pudo cargar la configuración"))
      .finally(() => setLoading(false));
  }, []);

  const patchSeller = (id: string, p: Partial<SellerCfg>) => setSellers((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const toggleDay = (s: SellerCfg, n: number) =>
    patchSeller(s.id, { workDays: s.workDays.includes(n) ? s.workDays.filter((d) => d !== n) : [...s.workDays, n] });

  const addHoliday = () => {
    if (!hDate || holidays.some((h) => h.date === hDate)) return;
    setHolidays((prev) => [...prev, { date: hDate, label: hLabel.trim() || "Festivo" }].sort((a, b) => a.date.localeCompare(b.date)));
    setHDate(""); setHLabel("");
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const r = await fetch("/api/panel/calendar/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deadlineMinutes: fromTime(deadline),
          trackingStartDate: start,
          holidays,
          sellers: sellers.map((s) => ({ userId: s.id, workDays: s.workDays, active: s.active })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-black text-[#1A1A1A]">Configurar calendario</h2>
            <p className="mt-1 text-sm text-[#64748B]">Días laborables, hora límite, festivos y vendedores activos.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"><MdClose size={20} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4">
          {loading ? <p className="py-10 text-center text-sm text-[#94A3B8]">Cargando…</p> : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#94A3B8]">
                  Hora límite de reporte (Bogotá)
                  <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${input} mt-1 w-full`} />
                </label>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#94A3B8]">
                  Seguimiento desde
                  <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${input} mt-1 w-full`} />
                </label>
              </div>
              <p className="-mt-3 text-xs text-[#94A3B8]">Los días anteriores al inicio del seguimiento no exigen reporte: sin ventas se ven en gris y con ventas en verde.</p>

              <section>
                <h3 className="mb-2 text-sm font-black text-[#1A1A1A]">Vendedores</h3>
                <div className="divide-y divide-[#F1F5F9] rounded-2xl border border-[#E2E8F0]">
                  {sellers.length === 0 && <p className="p-4 text-sm text-[#94A3B8]">Sin vendedores.</p>}
                  {sellers.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${s.active ? "text-[#1A1A1A]" : "text-[#94A3B8]"}`}>{s.name}</span>
                      <div className="flex gap-1">
                        {DAYS.map((d) => (
                          <button
                            key={d.n} type="button" onClick={() => toggleDay(s, d.n)} aria-pressed={s.workDays.includes(d.n)}
                            className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${s.workDays.includes(d.n) ? "bg-[#27B1B8] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}
                          >{d.l}</button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                        <input type="checkbox" checked={s.active} onChange={(e) => patchSeller(s.id, { active: e.target.checked })} className="accent-[#27B1B8]" />
                        Activo
                      </label>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-black text-[#1A1A1A]">Festivos y excepciones</h3>
                <div className="flex flex-wrap gap-2">
                  <input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} className={input} />
                  <input value={hLabel} onChange={(e) => setHLabel(e.target.value)} placeholder="Nombre (opcional)" maxLength={80} className={`${input} min-w-0 flex-1`} />
                  <button type="button" onClick={addHoliday} disabled={!hDate} className="inline-flex items-center gap-1 rounded-xl bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
                    <MdAdd size={16} /> Agregar
                  </button>
                </div>
                <ul className="mt-3 space-y-1">
                  {holidays.length === 0 && <li className="text-sm text-[#94A3B8]">Sin festivos cargados.</li>}
                  {holidays.map((h) => (
                    <li key={h.date} className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm">
                      <span><b className="text-[#334155]">{h.date}</b> <span className="text-[#64748B]">· {h.label}</span></span>
                      <button aria-label="Quitar festivo" onClick={() => setHolidays((p) => p.filter((x) => x.date !== h.date))} className="text-[#94A3B8] hover:text-[#DC2626]"><MdDeleteOutline size={18} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#F1F5F9] px-6 py-4">
          <p className="min-w-0 text-sm text-[#DC2626]">{error}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#475569]">Cancelar</button>
            <button onClick={save} disabled={saving || loading} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";
import { MdClose } from "react-icons/md";

export const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function todayBogota(offsetDays = 0) {
  const d = new Date(Date.now() - 5 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export const inputCls = "w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm";
export const labelCls = "mb-1 block text-xs font-bold text-[#64748B]";
export const btnPrimary = "inline-flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-3.5 py-2 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]";

export type Permission = { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean };
export type ModalProps = { onClose: () => void; onDone: (msg: string) => void; onError: (msg: string) => void };

export async function post(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, error: r.ok ? null : ((await r.json()).error as string | undefined) ?? "Error" };
}
export async function patchReq(url: string, body: unknown) {
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: r.ok, error: r.ok ? null : ((await r.json()).error as string | undefined) ?? "Error" };
}

export function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: color }}>{icon}</span>
      <p className="mt-3 text-xl font-black text-[#1A1A1A]">{value}</p>
      <p className="text-xs text-[#64748B]">{label}</p>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-black text-[#1A1A1A] sm:text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-[#E2E8F0] py-8 text-center text-sm text-[#94A3B8]">{text}</p>;
}

export function Table({ head, rows, empty }: { head: (string | null)[]; rows: React.ReactNode[][]; empty: string }) {
  const cols = head.filter((h) => h !== null);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
          <tr>{cols.map((h, i) => <th key={i} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-[#F1F5F9]">
              {cells.filter((c) => c !== null).map((c, j) => <td key={j} className="px-4 py-3 text-[#1A1A1A]">{c}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-sm text-[#94A3B8]">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`max-h-[85vh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`}>
          <div className="mb-4 flex items-start justify-between">
            <h3 className="font-black text-[#1A1A1A]">{title}</h3>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1A1A1A]" aria-label="Cerrar"><MdClose size={18} /></button>
          </div>
          <div className="space-y-3">{children}</div>
          {footer && <div className="mt-5 flex gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Footer({ onClose, onSubmit, disabled, submitting }: { onClose: () => void; onSubmit: () => void; disabled?: boolean; submitting: boolean }) {
  return (
    <>
      <button onClick={onClose} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
      <button onClick={onSubmit} disabled={disabled || submitting} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">{submitting ? "Guardando…" : "Confirmar"}</button>
    </>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="text-sm font-black text-[#1A1A1A]">{value}</p>
    </div>
  );
}

export function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; icon: React.ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition ${
            value === t.key ? "bg-[#27B1B8] text-white" : "text-[#64748B] hover:bg-[#F8FAFC]"
          }`}
        >
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className={labelCls}>Desde</label>
        <input type="date" value={from} max={to} onChange={(e) => onFrom(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Hasta</label>
        <input type="date" value={to} min={from} onChange={(e) => onTo(e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

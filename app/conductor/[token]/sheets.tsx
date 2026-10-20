"use client";

import { useState } from "react";
import { MdClose, MdPhotoCamera } from "react-icons/md";
import { compressPhoto } from "./photo";

export type ChecklistItem = { key: string; category: string; label: string };
type Mark = "B" | "M" | "NA";

const shell = "fixed inset-0 z-50 flex items-end bg-black/40";
const panel = "mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4";
const primary = "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-3 text-sm font-bold text-white disabled:opacity-50";

function Header({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-base font-black text-[#1A1A1A]">{title}</p>
        {subtitle && <p className="text-xs text-[#64748B]">{subtitle}</p>}
      </div>
      <button onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1 text-[#64748B]"><MdClose size={22} /></button>
    </div>
  );
}

// Checklist pre-operacional F21: cada ítem se marca Bien / Mal / No aplica antes de enviar.
export function ChecklistSheet({ token, items, onClose, onDone }: { token: string; items: ChecklistItem[]; onClose: () => void; onDone: (bad: number) => void }) {
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [initials, setInitials] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missing = items.filter((i) => !marks[i.key]).length;
  const categories = [...new Set(items.map((i) => i.category))];

  const submit = async () => {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/conductor/${token}/checklist`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: marks, initials, notes }),
    }).catch(() => null);
    setSending(false);
    if (!res) return setError("Sin conexión. Necesitas señal para enviar el checklist.");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "No se pudo guardar el checklist.");
    onDone(json.bad ?? 0);
  };

  return (
    <div className={shell} role="dialog" aria-modal="true" aria-label="Checklist del vehículo">
      <div className={panel}>
        <Header title="Checklist del vehículo" subtitle="Revisión pre-operacional F21" onClose={onClose} />
        <button onClick={() => setMarks(Object.fromEntries(items.map((i) => [i.key, "B" as Mark])))} className="mt-3 w-full rounded-xl border border-[#27B1B8] px-3 py-2 text-xs font-bold text-[#0C535B]">Marcar todo en Bien</button>

        {categories.map((cat) => (
          <div key={cat} className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">{cat}</p>
            <ul className="mt-1 divide-y divide-[#F1F5F9]">
              {items.filter((i) => i.category === cat).map((i) => (
                <li key={i.key} className="py-2">
                  <p className="text-sm text-[#1A1A1A]">{i.label}</p>
                  <div className="mt-1 flex gap-2">
                    {([["B", "Bien", "border-[#27B1B8] bg-[#F0FDFA] text-[#0C535B]"], ["M", "Mal", "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]"], ["NA", "No aplica", "border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]"]] as const).map(([v, label, on]) => (
                      <button key={v} onClick={() => setMarks((m) => ({ ...m, [i.key]: v }))} aria-pressed={marks[i.key] === v}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold ${marks[i.key] === v ? on : "border-[#E2E8F0] text-[#64748B]"}`}>{label}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <input value={initials} onChange={(e) => setInitials(e.target.value)} maxLength={10} placeholder="Iniciales (opcional)"
          className="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Observaciones (opcional)"
          className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
        {error && <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>}
        <button onClick={submit} disabled={sending || missing > 0} className={primary}>
          {sending ? "Guardando..." : missing > 0 ? `Faltan ${missing} ítem${missing === 1 ? "" : "s"} por marcar` : "Enviar checklist"}
        </button>
      </div>
    </div>
  );
}

// Novedad en ruta (llanta, accidente, tráfico...): tipo de lista fija, detalle y foto opcionales. Necesita señal.
export function IncidentSheet({ token, types, onClose, onDone }: { token: string; types: Record<string, string>; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("type", type);
      if (description.trim()) form.set("description", description.trim());
      if (photo) form.set("photo", await compressPhoto(photo));
      const res = await fetch(`/api/conductor/${token}/novedad`, { method: "POST", body: form }).catch(() => null);
      if (!res) return setError("Sin conexión. Intenta de nuevo con señal o llama a la oficina.");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return setError(json.error ?? "No se pudo registrar la novedad.");
      if (preview) URL.revokeObjectURL(preview);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la novedad.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={shell} role="dialog" aria-modal="true" aria-label="Reportar novedad">
      <div className={panel}>
        <Header title="Reportar novedad" subtitle="La oficina la verá en el panel de Logística" onClose={onClose} />
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(types).map(([code, label]) => (
            <button key={code} onClick={() => setType(code)} aria-pressed={type === code}
              className={`rounded-full border px-3 py-2 text-xs font-bold ${type === code ? "border-[#27B1B8] bg-[#F0FDFA] text-[#0C535B]" : "border-[#E2E8F0] text-[#475569]"}`}>{label}</button>
          ))}
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="¿Qué pasó? (opcional)"
          className="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#CBD5E1] p-4 text-center text-xs font-bold text-[#475569]">
          {preview
            ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Foto de la novedad" className="max-h-48 rounded-lg object-contain" />
            : <><MdPhotoCamera size={28} className="text-[#27B1B8]" />Tomar foto (opcional)</>}
          {preview && <span className="text-[#27B1B8]">Cambiar foto</span>}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {error && <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>}
        <button onClick={submit} disabled={sending || !type} className={primary}>{sending ? "Enviando..." : "Enviar novedad"}</button>
      </div>
    </div>
  );
}

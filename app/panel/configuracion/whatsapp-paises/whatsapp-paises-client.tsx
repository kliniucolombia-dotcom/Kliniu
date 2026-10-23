"use client";

import { useState } from "react";
import { MdChat } from "react-icons/md";
import { WHATSAPP_COUNTRIES, type CountryWhatsapp } from "@/lib/whatsapp-countries";

export default function WhatsappPaisesClient({ initial }: { initial: CountryWhatsapp }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const invalid = WHATSAPP_COUNTRIES.find(({ code }) => values[code] && values[code].length !== 8);

  const save = async () => {
    if (saving || invalid) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/panel/country-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error();
      setValues(await res.json());
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-xl font-black text-[#1A1A1A]">WhatsApp por país</h1>
      <p className="mt-1 text-sm text-[#64748B]">
        Número de WhatsApp que atiende las compras de cada país. Colombia sigue usando los asesores actuales. Si un país queda vacío, su botón de WhatsApp no estará disponible.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {WHATSAPP_COUNTRIES.map(({ code, label, dial }) => {
          const value = values[code];
          const bad = value && value.length !== 8;
          return (
            <div key={code} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <label htmlFor={`wa-${code}`} className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                <MdChat size={16} className="text-[#25D366]" /> {label}
              </label>
              <div className={`mt-3 flex items-center overflow-hidden rounded-xl border ${bad ? "border-red-400" : "border-[#E2E8F0] focus-within:border-[#27B1B8]"}`}>
                <span className="bg-[#F1F5F9] px-3 py-2.5 text-sm font-semibold text-[#64748B]">+{dial}</span>
                <input
                  id={`wa-${code}`}
                  type="tel"
                  inputMode="numeric"
                  placeholder="8 dígitos"
                  value={value}
                  onChange={(e) => setValues((v) => ({ ...v, [code]: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                  className="min-w-0 flex-1 px-3 py-2.5 text-sm text-[#1A1A1A] outline-none"
                />
              </div>
              {bad && <p className="mt-1.5 text-xs text-red-500">El número debe tener 8 dígitos.</p>}
              {!value && <p className="mt-1.5 text-xs text-[#94A3B8]">Sin número: WhatsApp no disponible en {label}.</p>}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || !!invalid}
        className="mt-6 rounded-xl bg-[#27B1B8] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0C535B] disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
      {saved && <p className="mt-4 text-xs font-semibold text-[#27B1B8]">Cambio guardado.</p>}
      {error && <p className="mt-4 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}

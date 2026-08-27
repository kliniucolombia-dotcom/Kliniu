"use client";

import { useState } from "react";
import { MdShoppingCart, MdChat, MdCheckCircle } from "react-icons/md";

type SaleMode = "cart" | "whatsapp";

export default function ModoVentaClient({ initialMode }: { initialMode: SaleMode }) {
  const [mode, setMode] = useState<SaleMode>(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changeMode = async (next: SaleMode) => {
    if (next === mode || saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/panel/sale-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMode(data.mode);
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
      <h1 className="text-xl font-black text-[#1A1A1A]">Modo de Venta</h1>
      <p className="mt-1 text-sm text-[#64748B]">
        Controla si el sitio vende por carrito propio o si redirige a WhatsApp. Aplica a productos, combos y outlet en todo el sitio.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => changeMode("cart")}
          className={`flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all disabled:opacity-60 ${
            mode === "cart"
              ? "border-[#27B1B8] bg-[#EAF8F7] shadow-[0_2px_12px_rgba(39,177,184,0.2)]"
              : "border-[#E2E8F0] bg-white hover:border-[#27B1B8]/50"
          }`}
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${mode === "cart" ? "bg-[#27B1B8] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
            <MdShoppingCart size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold text-[#1A1A1A]">Modo Carrito</span>
            <span className="mt-1 block text-xs text-[#64748B]">Venta por la página: carrito propio, checkout y Wompi.</span>
          </span>
          {mode === "cart" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#0C535B]">
              <MdCheckCircle size={14} /> Activo
            </span>
          )}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => changeMode("whatsapp")}
          className={`flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all disabled:opacity-60 ${
            mode === "whatsapp"
              ? "border-[#25D366] bg-[#E9FBF0] shadow-[0_2px_12px_rgba(37,211,102,0.2)]"
              : "border-[#E2E8F0] bg-white hover:border-[#25D366]/50"
          }`}
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${mode === "whatsapp" ? "bg-[#25D366] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
            <MdChat size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold text-[#1A1A1A]">Modo WhatsApp</span>
            <span className="mt-1 block text-xs text-[#64748B]">Todos los botones de compra contactan a un asesor por WhatsApp. El carrito y el checkout se ocultan.</span>
          </span>
          {mode === "whatsapp" && (
            <span className="flex items-center gap-1 text-xs font-semibold text-[#0C535B]">
              <MdCheckCircle size={14} /> Activo
            </span>
          )}
        </button>
      </div>

      {saving && <p className="mt-4 text-xs text-[#64748B]">Guardando...</p>}
      {saved && <p className="mt-4 text-xs font-semibold text-[#27B1B8]">Cambio guardado.</p>}
      {error && <p className="mt-4 text-xs font-semibold text-red-500">{error}</p>}
    </div>
  );
}

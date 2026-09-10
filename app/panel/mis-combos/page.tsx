"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Combo = {
  id: string;
  name: string;
  image: string | null;
  price: number;
  active: boolean;
  createdByName: string | null;
};

const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function IconGift() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 8h18v4H3z" />
      <path d="M12 8v13" />
      <path d="M12 8s-1.5-5-5-5-3 3.5 0 5" />
      <path d="M12 8s1.5-5 5-5 3 3.5 0 5" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export default function MisCombosPage() {
  const router = useRouter();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rCombos, rMe] = await Promise.all([fetch("/api/panel/combos?mine=1"), fetch("/api/panel/permissions")]);
    if (rCombos.status === 401 || rCombos.status === 403) { router.push("/login"); return; }
    setCombos(rCombos.ok ? await rCombos.json() : []);
    if (rMe.ok) setIsSuperAdmin((await rMe.json()).role === "SUPERADMIN");
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const copyLink = async (id: string) => {
    const url = `${window.location.origin}/combo/${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
  };

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
        <h1 className="text-3xl font-black text-[#1A1A1A]">{isSuperAdmin ? "Combos por vendedor" : "Mis Combos"}</h1>
        <p className="mt-1 text-sm text-[#6e7379]">
          {isSuperAdmin ? "Link de compra de cada combo, por el vendedor que lo creó." : "Los combos que has creado, listos para compartir con tus clientes."}
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl bg-[#EAF8F6] px-4 py-3.5 text-sm">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#27B1B8] text-[11px] font-bold text-white">i</span>
        <div>
          <p className="font-semibold text-[#0C535B]">Comparte tu link de compra</p>
          <p className="text-[#0C535B]/80">Cada combo tiene un link único. Cópialo y compártelo por WhatsApp con tus clientes — el contacto de venta queda asignado a ti automáticamente.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando combos…</div>
      ) : combos.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex max-w-sm flex-col items-center gap-3.5 rounded-[1.75rem] border border-black/8 bg-white px-12 py-14 text-center shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><IconGift /></span>
            <div>
              <p className="font-black text-[#1A1A1A]">{isSuperAdmin ? "Aún no hay combos" : "Aún no has creado combos"}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">Cuando se cree un combo desde el panel de Combos, aparecerá aquí con su link listo para compartir.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 260px))" }}>
          {combos.map((c) => (
            <div key={c.id} className="flex flex-col overflow-hidden rounded-[1.4rem] border border-black/8 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <div className="relative aspect-square w-full shrink-0 bg-[#F1F5F9]">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#CBD5E1]"><IconGift /></div>
                )}
                <span className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${c.active ? "text-[#15803D]" : "text-[#94A3B8]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-[#22C55E]" : "bg-[#CBD5E1]"}`} />
                  {c.active ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className="flex grow flex-col gap-2.5 p-4">
                <div>
                  <p className="text-sm font-extrabold leading-tight text-[#1A1A1A]">{c.name}</p>
                  <p className="mt-1 text-lg font-black text-[#0C535B]">{fmt(c.price)}</p>
                  {isSuperAdmin && <p className="mt-1 text-xs font-semibold text-[#94A3B8]">{c.createdByName || "Sin vendedor asignado"}</p>}
                </div>
                <div className="grow" />
                <button
                  type="button"
                  onClick={() => copyLink(c.id)}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5 text-[13px] font-bold text-white transition-colors duration-200 ${copiedId === c.id ? "bg-[#16A34A]" : "bg-[#0C535B] hover:bg-[#073D43]"}`}
                >
                  <IconLink /> {copiedId === c.id ? "Copiado ✓" : "Copiar link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

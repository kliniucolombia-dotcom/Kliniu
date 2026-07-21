"use client";
import { useEffect, useState } from "react";
import { MdCardGiftcard } from "react-icons/md";

type Benefit = { id: string; title: string; description: string };

export default function BeneficiosPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rrhh-local/benefits");
      if (res.ok) setBenefits(await res.json());
      else setError("No fue posible cargar los beneficios");
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdCardGiftcard size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Beneficios</h1>
          <p className="text-xs text-[#64748B]">Beneficios disponibles para colaboradores de Kliniu</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((b) => (
          <div key={b.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-sm font-black text-[#1A1A1A]">{b.title}</p>
            <p className="mt-1 text-xs text-[#64748B]">{b.description}</p>
          </div>
        ))}
        {benefits.length === 0 && (
          <p className="text-sm text-[#94A3B8]">Sin beneficios publicados todavía.</p>
        )}
      </div>
    </div>
  );
}

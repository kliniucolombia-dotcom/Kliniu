"use client";

import { useEffect, useState } from "react";
import { MdLocalShipping } from "react-icons/md";

// Portada de la app del conductor (abrirla desde el ícono): vuelve a la última ruta abierta en este teléfono.
export default function ConductorHome() {
  const [none, setNone] = useState(false);
  useEffect(() => {
    let last: string | null = null;
    try { last = localStorage.getItem("kliniu_conductor_last"); } catch { /* nada */ }
    if (last) window.location.replace(`/conductor/${encodeURIComponent(last)}`);
    else { const t = window.setTimeout(() => setNone(true), 0); return () => window.clearTimeout(t); }
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] p-6 text-center">
      {none ? (
        <div className="max-w-xs">
          <MdLocalShipping size={40} className="mx-auto text-[#27B1B8]" />
          <p className="mt-3 text-base font-black text-[#1A1A1A]">KLINIU Conductor</p>
          <p className="mt-2 text-sm text-[#64748B]">Abre el enlace de la ruta que te enviaron por WhatsApp y elige &quot;Abrir con KLINIU Conductor&quot;.</p>
        </div>
      ) : (
        <p className="text-sm text-[#64748B]">Cargando...</p>
      )}
    </main>
  );
}

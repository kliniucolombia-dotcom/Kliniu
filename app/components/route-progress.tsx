"use client";

import { useEffect, useState } from "react";
import { MdTimer } from "react-icons/md";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
};

// Contador en vivo de una ruta: tiempo desde que inició y paradas atendidas. Lo usan el panel y la app del conductor.
export function RouteProgress({ startedAt, attended, total }: { startedAt: string | null; attended: number; total: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t0 = window.setTimeout(() => setNow(Date.now()), 0);
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearTimeout(t0); window.clearInterval(t); };
  }, []);

  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-[#475569]">
        <span className="inline-flex items-center gap-1.5 font-bold text-[#0C535B]">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#27B1B8] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#27B1B8]" /></span>
          <MdTimer size={15} />En ruta
          <span className="tabular-nums" aria-label="Tiempo en ruta">{startedAt && now ? clock(now - new Date(startedAt).getTime()) : "--:--:--"}</span>
        </span>
        <span className="font-bold tabular-nums">{attended} de {total} parada{total === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={attended}>
        <div className="h-full rounded-full bg-[#27B1B8] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

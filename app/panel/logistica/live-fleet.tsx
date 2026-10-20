"use client";

import { useEffect, useRef, useState } from "react";
import { MdSignalWifiOff, MdPauseCircle, MdCheckCircle } from "react-icons/md";
import { RouteProgress } from "@/app/components/route-progress";
import { loadGoogle } from "./route-map";
import { stopColor, stopIcon, vehicleIcon, type StopResult } from "./map-icons";

type LiveStop = { id: string; name: string; address: string; lat: number | null; lng: number | null; result: StopResult; cancelled: boolean };
type LiveRoute = {
  id: string;
  startedAt: string | null;
  plate: string;
  type: string;
  driver: string;
  stops: LiveStop[];
  last: { lat: number; lng: number; recordedAt: string } | null;
  alerts: { kind: "NO_SIGNAL" | "STOPPED"; sinceMin: number }[];
};

const POLL_MS = 15_000;
const BOGOTA = { lat: 4.711, lng: -74.0721 };

// Verde reportando, ámbar detenido, rojo sin señal, gris sin primera posición.
const stateOf = (r: LiveRoute) => {
  const a = r.alerts[0];
  if (a?.kind === "NO_SIGNAL") return { color: "#DC2626", label: `Sin señal desde hace ${a.sinceMin} min` };
  if (a?.kind === "STOPPED") return { color: "#D97706", label: `Detenido hace ${a.sinceMin} min` };
  if (!r.last) return { color: "#94A3B8", label: "Esperando primera posición" };
  return { color: "#16A34A", label: "Reportando" };
};

// Torre de control: todas las rutas en curso en un solo mapa. Al elegir una se ven sus paradas por estado.
export function LiveFleet() {
  const [routes, setRoutes] = useState<LiveRoute[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = useRef<{ google: any; map: any; vehicles: Map<string, any>; stops: any[]; fitFor: string | null } | null>(null);

  // Datos: se piden al abrir y cada 15 s (en pausa con la pestaña oculta).
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState === "hidden") return;
      const res = await fetch("/api/panel/logistica/en-vivo", { cache: "no-store" }).catch(() => null);
      if (!alive || !res) return;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setError(json.error ?? "No se pudo cargar la flota");
      else { setError(null); setRoutes(json.routes); }
    };
    void load();
    const t = window.setInterval(load, POLL_MS);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  // Mapa: se crea una sola vez.
  useEffect(() => {
    let cancelled = false;
    loadGoogle().then((google) => {
      if (cancelled || !box.current) return;
      const map = new google.maps.Map(box.current, { center: BOGOTA, zoom: 11, mapTypeControl: false, streetViewControl: false });
      g.current = { google, map, vehicles: new Map(), stops: [], fitFor: null };
      setMapReady(true);
    }).catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar Google Maps"));
    return () => { cancelled = true; };
  }, []);

  // Marcadores: vehículos de todas las rutas; paradas solo de la ruta elegida.
  useEffect(() => {
    const ctx = g.current;
    if (!ctx || !routes) return;
    const { google, map, vehicles } = ctx;
    const seen = new Set<string>();
    for (const r of routes) {
      if (!r.last) continue;
      seen.add(r.id);
      const pos = { lat: r.last.lat, lng: r.last.lng };
      const icon = vehicleIcon(google, r.type, stateOf(r).color);
      const m = vehicles.get(r.id);
      if (m) { m.setPosition(pos); m.setIcon(icon); m.setTitle(`${r.plate} · ${r.driver}`); }
      else {
        const marker = new google.maps.Marker({ map, position: pos, icon, title: `${r.plate} · ${r.driver}`, zIndex: 999 });
        marker.addListener("click", () => setSelected(r.id));
        vehicles.set(r.id, marker);
      }
    }
    for (const [id, m] of vehicles) if (!seen.has(id)) { m.setMap(null); vehicles.delete(id); }

    ctx.stops.forEach((m) => m.setMap(null));
    ctx.stops = [];
    const sel = routes.find((r) => r.id === selected);
    const bounds = new google.maps.LatLngBounds();
    if (sel) {
      const nextId = sel.stops.find((s) => !s.result && !s.cancelled)?.id;
      sel.stops.forEach((s, i) => {
        if (s.cancelled || s.lat == null || s.lng == null) return;
        ctx.stops.push(new google.maps.Marker({ map, position: { lat: s.lat, lng: s.lng }, title: `${i + 1}. ${s.name}`, icon: stopIcon(google, i + 1, stopColor(s.result, s.id === nextId)), zIndex: 500 }));
        bounds.extend({ lat: s.lat, lng: s.lng });
      });
      if (sel.last) bounds.extend({ lat: sel.last.lat, lng: sel.last.lng });
    } else {
      routes.forEach((r) => r.last && bounds.extend({ lat: r.last.lat, lng: r.last.lng }));
    }
    // Se reencuadra al cambiar la selección o la primera vez, no en cada refresco (el mapa saltaría).
    const key = selected ?? "todas";
    if (ctx.fitFor !== key && !bounds.isEmpty()) {
      ctx.fitFor = key;
      map.fitBounds(bounds, 60);
      if (map.getZoom() > 16) map.setZoom(16);
    }
  }, [routes, selected, mapReady]);

  if (error && !routes) return <p className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>;
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
          {routes ? `${routes.length} ruta${routes.length === 1 ? "" : "s"} en curso` : "Cargando rutas..."}
        </p>
        {routes?.length === 0 && <p className="rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">No hay rutas en curso. Cuando inicies una, aparece aquí con su vehículo en el mapa.</p>}
        {routes?.map((r) => {
          const st = stateOf(r);
          const attended = r.stops.filter((s) => s.result).length;
          const active = selected === r.id;
          return (
            <button key={r.id} onClick={() => setSelected(active ? null : r.id)} aria-pressed={active}
              className={`block w-full rounded-2xl border bg-white p-3 text-left ${active ? "border-[#27B1B8] ring-2 ring-[#27B1B8]/20" : "border-[#E2E8F0]"}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-black text-[#1A1A1A]">{r.plate} · {r.driver}</p>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: st.color }} aria-hidden />
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold" style={{ color: st.color }}>
                {r.alerts[0]?.kind === "NO_SIGNAL" ? <MdSignalWifiOff size={14} /> : r.alerts[0]?.kind === "STOPPED" ? <MdPauseCircle size={14} /> : <MdCheckCircle size={14} />}
                {st.label}
              </p>
              <div className="mt-2"><RouteProgress startedAt={r.startedAt} attended={attended} total={r.stops.filter((s) => !s.cancelled).length} /></div>
            </button>
          );
        })}
      </div>
      <div className="min-w-0">
        <div className="relative h-[28rem] w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] lg:h-[36rem]">
          <div ref={box} className="h-full w-full" />
          {!mapReady && <p className="absolute inset-0 grid place-items-center text-xs text-[#64748B]">Cargando mapa...</p>}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]" aria-label="Leyenda del mapa">
          {([["#16A34A", "Reportando"], ["#D97706", "Detenido"], ["#DC2626", "Sin señal"], ["#94A3B8", "Sin posición aún"]] as const).map(([c, l]) => (
            <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
          ))}
          <span>· Toca una ruta para ver sus paradas.</span>
        </p>
      </div>
    </div>
  );
}

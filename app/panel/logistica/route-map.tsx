"use client";

import { useEffect, useRef, useState } from "react";
import { MdPlayArrow, MdPause } from "react-icons/md";
import { vehicleIcon, stopIcon, stopColor, type GMaps, type StopResult } from "./map-icons";

type Live = { track: { lat: number; lng: number }[]; last: { lat: number; lng: number; speed: number | null; recordedAt: string } | null; distanceKm: number; startedAt: string | null; finishedAt: string | null };
type Replay = { points: { lat: number; lng: number; speed: number | null; recordedAt: string }[]; deliveries: { outcome: "DELIVERED" | "FAILED"; reason: string | null; lat: number | null; lng: number | null; recordedAt: string; name: string }[] };
type Stop = { id: string; name: string; address: string; lat: number | null; lng: number | null; result: StopResult };

let loader: Promise<GMaps> | null = null;
export function loadGoogle(): Promise<GMaps> {
  const w = window as unknown as { google?: GMaps };
  if (w.google?.maps) return Promise.resolve(w.google);
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&v=weekly&language=es&region=CO`;
    s.async = true;
    s.onload = () => resolve((window as unknown as { google: GMaps }).google);
    s.onerror = () => { loader = null; reject(new Error("No se pudo cargar Google Maps")); };
    document.head.appendChild(s);
  });
  return loader;
}

function fmtDuration(from: string, to: string | null) {
  const mins = Math.max(0, Math.round(((to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()) / 60000));
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
}

export function RouteMap({ routeId, vehicleType, inProgress, finished = false }: { routeId: string; vehicleType: string; inProgress: boolean; finished?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Live | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const moveReplay = useRef<((i: number) => void) | null>(null);

  // Reproducción: avanza ~200 pasos en total sin importar cuántas posiciones haya.
  useEffect(() => {
    if (!playing || !replay) return;
    const step = Math.max(1, Math.round(replay.points.length / 200));
    const t = setInterval(() => {
      setIdx((i) => {
        const next = Math.min(replay.points.length - 1, i + step);
        if (next >= replay.points.length - 1) setPlaying(false);
        return next;
      });
    }, 150);
    return () => clearInterval(t);
  }, [playing, replay]);
  useEffect(() => { moveReplay.current?.(idx); }, [idx]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        const [res, google] = await Promise.all([
          fetch(`/api/panel/logistica/rutas/${routeId}/mapa`).then((r) => r.json()),
          loadGoogle(),
        ]);
        if (cancelled || !ref.current) return;
        if (res.error) throw new Error(res.error);
        const stops: Stop[] = res.stops;
        const located = stops.filter((s) => s.lat != null && s.lng != null);
        setMissing(stops.filter((s) => s.lat == null || s.lng == null));
        const map = new google.maps.Map(ref.current, { center: { lat: 4.711, lng: -74.0721 }, zoom: 11, mapTypeControl: false, streetViewControl: false });
        const bounds = new google.maps.LatLngBounds();
        const info = new google.maps.InfoWindow();
        // Paradas numeradas por su orden en la ruta y coloreadas por estado (ver map-icons).
        const stopMarkers = new Map<string, { marker: any; n: number }>(); // eslint-disable-line @typescript-eslint/no-explicit-any
        const nextId = located.find((s) => !s.result)?.id;
        located.forEach((s) => {
          const pos = { lat: s.lat as number, lng: s.lng as number };
          const n = stops.indexOf(s) + 1;
          const marker = new google.maps.Marker({ position: pos, map, title: s.name, icon: stopIcon(google, n, stopColor(s.result, s.id === nextId)) });
          stopMarkers.set(s.id, { marker, n });
          marker.addListener("click", () => {
            const div = document.createElement("div");
            const b = document.createElement("strong");
            b.textContent = s.name;
            const p = document.createElement("div");
            p.textContent = s.address;
            div.append(b, p);
            info.setContent(div);
            info.open(map, marker);
          });
          bounds.extend(pos);
        });
        setLive(res.live);
        const trail = new google.maps.Polyline({ map, path: res.live.track, strokeColor: "#F97316", strokeOpacity: 0.9, strokeWeight: 4 });
        const car = new google.maps.Marker({ map, title: "Vehículo", zIndex: 999, icon: vehicleIcon(google, vehicleType, "#F97316") });
        const place = (l: Live) => {
          trail.setPath(l.track);
          if (l.last) { car.setPosition({ lat: l.last.lat, lng: l.last.lng }); car.setVisible(true); } else car.setVisible(false);
        };
        place(res.live);
        if (res.live.last) bounds.extend({ lat: res.live.last.lat, lng: res.live.last.lng });
        if (finished) {
          // Ruta cerrada: el recorrido se reproduce con un marcador propio y se marcan las entregas.
          const rp: Replay | null = await fetch(`/api/panel/logistica/rutas/${routeId}/mapa?replay=1`).then((x) => x.json()).catch(() => null);
          if (rp?.points?.length && !cancelled) {
            car.setVisible(false);
            const mover = new google.maps.Marker({ map, zIndex: 998, title: "Reproducción", position: rp.points[0], icon: vehicleIcon(google, vehicleType, "#2563EB") });
            moveReplay.current = (i) => rp.points[i] && mover.setPosition({ lat: rp.points[i].lat, lng: rp.points[i].lng });
            const hhmm = (d: string) => new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
            rp.deliveries.forEach((d) => {
              if (d.lat == null || d.lng == null) return;
              new google.maps.Marker({ map, position: { lat: d.lat, lng: d.lng }, zIndex: 500, title: `${d.name} · ${d.outcome === "DELIVERED" ? "Entregado" : "No entregado"} ${hhmm(d.recordedAt)}`, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: d.outcome === "DELIVERED" ? "#16A34A" : "#D97706", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } });
            });
            setIdx(0);
            setReplay(rp);
          }
        }
        if (inProgress) {
          timer = setInterval(async () => {
            const r = await fetch(`/api/panel/logistica/rutas/${routeId}/mapa?live=1`).then((x) => x.json()).catch(() => null);
            if (r?.live && !cancelled) {
              setLive(r.live);
              place(r.live);
              // Colores de las paradas al día sin recargar el mapa.
              const res: { id: string; result: StopResult }[] = r.stops ?? [];
              const next = res.find((x) => !x.result && stopMarkers.has(x.id))?.id;
              res.forEach((x) => { const m = stopMarkers.get(x.id); if (m) m.marker.setIcon(stopIcon(google, m.n, stopColor(x.result, x.id === next))); });
            }
          }, 15000);
        }
        if (located.length > 1) {
          new google.maps.Polyline({ map, path: located.map((s) => ({ lat: s.lat as number, lng: s.lng as number })), strokeColor: "#27B1B8", strokeOpacity: 0.7, strokeWeight: 3 });
        }
        if (located.length + (res.live.last ? 1 : 0) > 1) {
          map.fitBounds(bounds, 40);
        } else if (located.length === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(15);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar el mapa");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [routeId, vehicleType, inProgress, finished]);

  if (error) return <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>;
  return (
    <div className="mt-3">
      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]">
        <div ref={ref} className="h-full w-full" />
        {loading && <p className="absolute inset-0 grid place-items-center text-xs text-[#64748B]">Cargando mapa...</p>}
      </div>
      {replay && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
          <button
            onClick={() => { if (idx >= replay.points.length - 1) setIdx(0); setPlaying((p) => !p); }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB] text-white"
            aria-label={playing ? "Pausar" : "Reproducir recorrido"}
          >
            {playing ? <MdPause size={18} /> : <MdPlayArrow size={18} />}
          </button>
          <input
            type="range" min={0} max={replay.points.length - 1} value={idx}
            onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
            className="min-w-0 flex-1" aria-label="Posición del recorrido"
          />
          <span className="shrink-0 text-xs tabular-nums text-[#475569]">
            {new Date(replay.points[idx].recordedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            {replay.points[idx].speed != null && ` · ${Math.round(replay.points[idx].speed!)} km/h`}
          </span>
        </div>
      )}
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#64748B]" aria-label="Leyenda del mapa">
        {([["#16A34A", "Entregada"], ["#D97706", "No entregada"], ["#27B1B8", "Próxima"], ["#64748B", "Pendiente"]] as const).map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{l}</span>
        ))}
      </p>
      {live && live.startedAt && (
        <p className="mt-2 text-xs text-[#475569]">
          Recorrido: <b>{live.distanceKm} km</b> · Duración: <b>{fmtDuration(live.startedAt, live.finishedAt)}</b>
          {live.last && inProgress && <> · Última posición {new Date(live.last.recordedAt).toLocaleTimeString("es-CO")}</>}
          {!live.last && inProgress && <> · Esperando posición del conductor</>}
        </p>
      )}
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-[#B45309]">Sin ubicar: {missing.map((m) => m.name).join(", ")}. Revisa la dirección.</p>
      )}
    </div>
  );
}

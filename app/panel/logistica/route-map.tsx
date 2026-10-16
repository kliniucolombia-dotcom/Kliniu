"use client";

import { useEffect, useRef, useState } from "react";

type Stop = { id: string; name: string; address: string; lat: number | null; lng: number | null };

type GMaps = { maps: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

let loader: Promise<GMaps> | null = null;
function loadGoogle(): Promise<GMaps> {
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

export function RouteMap({ routeId }: { routeId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
        located.forEach((s, i) => {
          const pos = { lat: s.lat as number, lng: s.lng as number };
          const marker = new google.maps.Marker({ position: pos, map, label: String(i + 1), title: s.name });
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
        if (located.length > 1) {
          new google.maps.Polyline({ map, path: located.map((s) => ({ lat: s.lat as number, lng: s.lng as number })), strokeColor: "#27B1B8", strokeOpacity: 0.7, strokeWeight: 3 });
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
    return () => { cancelled = true; };
  }, [routeId]);

  if (error) return <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>;
  return (
    <div className="mt-3">
      <div className="relative h-72 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]">
        <div ref={ref} className="h-full w-full" />
        {loading && <p className="absolute inset-0 grid place-items-center text-xs text-[#64748B]">Cargando mapa...</p>}
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-xs text-[#B45309]">Sin ubicar: {missing.map((m) => m.name).join(", ")}. Revisa la dirección.</p>
      )}
    </div>
  );
}

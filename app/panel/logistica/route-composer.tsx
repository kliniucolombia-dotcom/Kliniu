"use client";
import React, { useEffect, useRef, useState } from "react";
import { MdAdd, MdArrowDownward, MdArrowUpward, MdClose, MdMap } from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { inputCls, labelCls } from "../_components/ops-ui";
import { departamentosColombia } from "@/lib/colombia-locations";
import { loadGoogle } from "./route-map";

// Piezas del modal "Nueva ruta": paradas desde cero y previsualización ordenable en el mapa.

export type NewStopDraft = {
  uid: string;
  name: string; phone: string; department: string; city: string; address: string; address2: string; notes: string;
  lat: number | null; lng: number | null;
};
export type OrderInfo = { id: string; customerName: string; addressLine1: string; city: string };
type Point = { key: string; name: string; address: string; lat: number | null; lng: number | null };

const EMPTY = { name: "", phone: "", department: "Cundinamarca", city: "Bogotá", address: "", address2: "", notes: "" };

// Parada que no viene de un pedido: logística la escribe y se guarda como pedido manual dentro de la ruta.
export function NewStopsEditor({ stops, onChange, onError }: { stops: NewStopDraft[]; onChange: (s: NewStopDraft[]) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.name.trim() && f.address.trim() && f.city.trim() && f.department;

  const add = async () => {
    setBusy(true);
    let loc: { lat: number; lng: number } | null = null;
    try {
      const r = await fetch("/api/panel/logistica/geocodificar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: { address: f.address, city: f.city, department: f.department } }),
      }).then((x) => x.json());
      loc = r.location ?? null;
    } catch { onError("No se pudo ubicar la dirección en el mapa; se agregó sin ubicación"); }
    setBusy(false);
    onChange([...stops, { ...f, uid: crypto.randomUUID(), lat: loc?.lat ?? null, lng: loc?.lng ?? null }]);
    setF(EMPTY);
    setOpen(false);
  };

  return (
    <div>
      <label className={labelCls}>Paradas nuevas ({stops.length})</label>
      {stops.length > 0 && (
        <div className="mb-2 space-y-1 rounded-xl border border-[#E2E8F0] p-2">
          {stops.map((st) => (
            <div key={st.uid} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs">
              <span className="min-w-0 flex-1">
                <b className="text-[#1A1A1A]">{st.name}</b>{st.phone && <span className="text-[#64748B]"> · {st.phone}</span>}
                <span className="block text-[#64748B]">{[st.address, st.address2, st.city, st.department].filter(Boolean).join(", ")}</span>
                {st.notes && <span className="block italic text-[#94A3B8]">“{st.notes}”</span>}
                {st.lat == null && <span className="block font-semibold text-[#B45309]">No se pudo ubicar en el mapa, revisa la dirección</span>}
              </span>
              <button type="button" aria-label="Quitar parada" className="text-[#94A3B8] hover:text-[#DC2626]" onClick={() => onChange(stops.filter((x) => x.uid !== st.uid))}><MdClose size={16} /></button>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-2.5 text-xs font-bold text-[#475569] hover:border-[#27B1B8] hover:text-[#27B1B8]">
          <MdAdd size={15} />Agregar parada desde cero
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
          <input value={f.name} onChange={set("name")} className={inputCls} placeholder="Nombre del cliente *" />
          <input value={f.phone} onChange={set("phone")} className={inputCls} placeholder="Teléfono" inputMode="tel" />
          <SimpleSelect value={f.department} options={departamentosColombia.map((d) => ({ value: d, label: d }))} onChange={(v) => setF((p) => ({ ...p, department: v }))} />
          <input value={f.city} onChange={set("city")} className={inputCls} placeholder="Ciudad *" />
          <input value={f.address} onChange={set("address")} className={inputCls} placeholder="Dirección * (ej. Calle 72 # 10-34)" />
          <input value={f.address2} onChange={set("address2")} className={inputCls} placeholder="Complemento (apto, local, barrio)" />
          <input value={f.notes} onChange={set("notes")} className={inputCls} placeholder="Notas de entrega" />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setF(EMPTY); }} className="flex-1 rounded-xl border border-[#E2E8F0] bg-white py-2 text-xs font-bold text-[#64748B]">Cancelar</button>
            <button type="button" disabled={!valid || busy} onClick={add} className="flex-1 rounded-xl bg-[#27B1B8] py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Ubicando…" : "Agregar parada"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Un solo mapa por montaje (Google cobra por carga): al cambiar las paradas solo se redibujan los marcadores.
function PreviewMap({ points }: { points: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const overlays = useRef<{ setMap: (m: null) => void }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !ref.current) return;
        mapRef.current ??= new google.maps.Map(ref.current, { center: { lat: 4.711, lng: -74.0721 }, zoom: 11, mapTypeControl: false, streetViewControl: false });
        const map = mapRef.current;
        overlays.current.forEach((o) => o.setMap(null));
        overlays.current = [];
        const located = points.map((p, i) => ({ ...p, i, pos: { lat: p.lat as number, lng: p.lng as number } })).filter((p) => p.lat != null && p.lng != null);
        const bounds = new google.maps.LatLngBounds();
        located.forEach((p) => {
          overlays.current.push(new google.maps.Marker({ position: p.pos, map, label: String(p.i + 1), title: p.name }));
          bounds.extend(p.pos);
        });
        if (located.length > 1) {
          overlays.current.push(new google.maps.Polyline({ map, path: located.map((p) => p.pos), strokeColor: "#27B1B8", strokeOpacity: 0.7, strokeWeight: 3 }));
          map.fitBounds(bounds, 40);
        } else if (located.length === 1) {
          map.setCenter(located[0].pos);
          map.setZoom(15);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Error al cargar el mapa"));
    return () => { cancelled = true; };
  }, [points]);

  if (error) return <p className="mt-2 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>;
  return <div ref={ref} className="mt-2 h-64 w-full overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F1F5F9]" />;
}

// Orden de la ruta + mapa. `keys` ("o:<id>" pedido, "n:<uid>" parada nueva) ya vienen ordenadas por el modal.
export function RoutePreview({ keys, orders, newStops, onMove }: { keys: string[]; orders: OrderInfo[]; newStops: NewStopDraft[]; onMove: (index: number, dir: -1 | 1) => void }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<Record<string, { lat: number | null; lng: number | null }>>({});
  const [error, setError] = useState<string | null>(null);
  const missing = keys.filter((k) => k.startsWith("o:") && !(k.slice(2) in coords)).map((k) => k.slice(2));
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!show || !missingKey) return;
    let cancelled = false;
    fetch("/api/panel/logistica/geocodificar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds: missingKey.split(",") }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.error) { setError(res.error); return; }
        setError(null);
        setCoords((c) => ({ ...c, ...Object.fromEntries((res.stops as { id: string; lat: number | null; lng: number | null }[]).map((s) => [s.id, { lat: s.lat, lng: s.lng }])) }));
      })
      .catch(() => !cancelled && setError("No se pudo cargar la previsualización"));
    return () => { cancelled = true; };
  }, [show, missingKey]);

  const points: Point[] = keys.map((k) => {
    if (k.startsWith("o:")) {
      const o = orders.find((x) => x.id === k.slice(2));
      const c = coords[k.slice(2)];
      return { key: k, name: o?.customerName ?? "Pedido", address: `${o?.addressLine1 ?? ""}, ${o?.city ?? ""}`, lat: c?.lat ?? null, lng: c?.lng ?? null };
    }
    const n = newStops.find((x) => x.uid === k.slice(2));
    return { key: k, name: n?.name ?? "Parada", address: `${n?.address ?? ""}, ${n?.city ?? ""}`, lat: n?.lat ?? null, lng: n?.lng ?? null };
  });
  // Misma identidad mientras no cambien paradas ni coordenadas, para no redibujar el mapa en cada render.
  const pointsSig = JSON.stringify(points);
  const stable = React.useMemo(() => points, [pointsSig]); // eslint-disable-line react-hooks/exhaustive-deps

  if (keys.length === 0) return null;
  return (
    <div>
      <label className={labelCls}>Orden de la ruta ({keys.length} parada{keys.length === 1 ? "" : "s"})</label>
      <ol className="space-y-1 rounded-xl border border-[#E2E8F0] p-2">
        {points.map((p, i) => (
          <li key={p.key} className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#27B1B8] text-[10px] font-bold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1"><b className="text-[#1A1A1A]">{p.name}</b><span className="block truncate text-[#64748B]">{p.address}</span></span>
            <button type="button" aria-label="Subir parada" disabled={i === 0} onClick={() => onMove(i, -1)} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30"><MdArrowUpward size={16} /></button>
            <button type="button" aria-label="Bajar parada" disabled={i === points.length - 1} onClick={() => onMove(i, 1)} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-30"><MdArrowDownward size={16} /></button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => setShow((v) => !v)} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#27B1B8]">
        <MdMap size={16} />{show ? "Ocultar previsualización" : "Previsualizar en el mapa"}
      </button>
      {show && (error
        ? <p className="mt-2 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{error}</p>
        : <>
            <PreviewMap points={stable} />
            {missing.length > 0 && <p className="mt-1 text-xs text-[#64748B]">Ubicando pedidos…</p>}
            {stable.some((p) => p.lat == null && !missing.length) && (
              <p className="mt-1 text-xs text-[#B45309]">Sin ubicar: {stable.filter((p) => p.lat == null).map((p) => p.name).join(", ")}. Revisa la dirección.</p>
            )}
          </>)}
    </div>
  );
}

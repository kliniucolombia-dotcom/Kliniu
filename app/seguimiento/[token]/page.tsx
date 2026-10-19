"use client";

import { use, useEffect, useRef, useState } from "react";
import { MdCheckCircle, MdLocalShipping, MdInventory2, MdPlace, MdWarningAmber } from "react-icons/md";
import { loadGoogle } from "@/app/panel/logistica/route-map";

type Data = {
  stage: "NOT_STARTED" | "EN_ROUTE" | "DELIVERED" | "FAILED";
  driver: string | null;
  plate: string | null;
  stopsAhead: number | null;
  destination: { lat: number; lng: number } | null;
  vehicle: { lat: number; lng: number; recordedAt: string } | null;
  distanceKm: number | null;
  deliveredAt: string | null;
};

const REFRESH_MS = 15_000;

export default function SeguimientoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<{ map: any; car: any; dest: any } | null>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Refresco cada 15 s solo con la pestaña visible.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const res = await fetch(`/api/seguimiento/${token}`, { cache: "no-store" }).catch(() => null);
      if (!res || !alive) return;
      const json = await res.json().catch(() => ({}));
      if (!alive) return;
      if (res.status === 404) setError("Este enlace de seguimiento no es válido.");
      else if (res.ok) { setData(json); setError(null); }
    };
    const onVisible = () => { if (document.visibilityState === "visible") void tick(); };
    void tick();
    const t = setInterval(onVisible, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [token]);

  const showMap = data?.stage === "EN_ROUTE" && (data.vehicle || data.destination);

  useEffect(() => {
    if (!showMap || !data || !mapEl.current) return;
    let cancelled = false;
    (async () => {
      const google = await loadGoogle().catch(() => null);
      if (!google || cancelled || !mapEl.current) return;
      if (!map.current) {
        const m = new google.maps.Map(mapEl.current, { center: data.vehicle ?? data.destination, zoom: 14, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
        const car = new google.maps.Marker({ map: m, title: "Vehículo KLINIU", zIndex: 999, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#27B1B8", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
        const dest = new google.maps.Marker({ map: m, title: "Tu dirección" });
        map.current = { map: m, car, dest };
      }
      const { map: m, car, dest } = map.current;
      if (data.destination) dest.setPosition(data.destination);
      if (data.vehicle) { car.setPosition({ lat: data.vehicle.lat, lng: data.vehicle.lng }); car.setVisible(true); } else car.setVisible(false);
      if (data.vehicle && data.destination) {
        const b = new google.maps.LatLngBounds();
        b.extend(data.vehicle); b.extend(data.destination);
        m.fitBounds(b, 50);
      }
    })();
    return () => { cancelled = true; };
  }, [showMap, data]);

  if (error) return <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] p-6 text-center text-sm text-[#64748B]">{error}</main>;
  if (!data) return <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] text-sm text-[#64748B]">Cargando...</main>;

  const step = data.stage === "DELIVERED" ? 2 : data.stage === "EN_ROUTE" ? 1 : 0;
  const steps = [{ label: "Preparando", Icon: MdInventory2 }, { label: "En camino", Icon: MdLocalShipping }, { label: "Entregado", Icon: MdCheckCircle }];

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-[#F8FAFC] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[#0C535B]">Seguimiento de tu pedido</p>
      <h1 className="mt-1 text-xl font-black text-[#1A1A1A]">
        {data.stage === "DELIVERED" ? "Tu pedido fue entregado" : data.stage === "FAILED" ? "No pudimos entregar tu pedido" : data.stage === "EN_ROUTE" ? "Tu pedido va en camino" : "Estamos preparando tu pedido"}
      </h1>

      {data.stage !== "FAILED" && (
        <ol className="mt-4 flex items-start justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {steps.map(({ label, Icon }, i) => (
            <li key={label} className="flex flex-1 flex-col items-center gap-1 text-center" aria-current={i === step ? "step" : undefined}>
              <span className={`grid h-9 w-9 place-items-center rounded-full ${i <= step ? "bg-[#27B1B8] text-white" : "bg-[#F1F5F9] text-[#94A3B8]"}`}><Icon size={20} /></span>
              <span className={`text-xs font-bold ${i <= step ? "text-[#0C535B]" : "text-[#94A3B8]"}`}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      {data.stage === "FAILED" && (
        <p className="mt-4 flex gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 text-sm text-[#92400E]"><MdWarningAmber size={20} className="shrink-0" />Nos pondremos en contacto contigo para reprogramar la entrega.</p>
      )}

      {data.stage === "EN_ROUTE" && (
        <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {data.stopsAhead != null && (
            <p className="text-sm font-bold text-[#1A1A1A]">
              {data.stopsAhead === 0 ? "Eres la siguiente entrega" : data.stopsAhead === 1 ? "Falta 1 entrega antes de la tuya" : `Faltan ${data.stopsAhead} entregas antes de la tuya`}
            </p>
          )}
          {data.distanceKm != null && <p className="mt-1 flex items-center gap-1 text-sm text-[#475569]"><MdPlace size={16} className="text-[#27B1B8]" />A {data.distanceKm} km de tu dirección (en línea recta, aproximado)</p>}
          {!data.vehicle && <p className="mt-1 text-sm text-[#B45309]">Sin señal reciente del vehículo.</p>}
          {data.driver && <p className="mt-2 text-xs text-[#64748B]">Conductor: {data.driver}{data.plate ? ` · Placa ${data.plate}` : ""}</p>}
        </div>
      )}

      {showMap && <div ref={mapEl} className="mt-3 h-72 w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9]" aria-label="Mapa con la ubicación del vehículo" />}

      {data.stage === "DELIVERED" && data.deliveredAt && (
        <p className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#475569]">
          Entregado el {new Date(data.deliveredAt).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}. Gracias por confiar en KLINIU.
        </p>
      )}
    </main>
  );
}

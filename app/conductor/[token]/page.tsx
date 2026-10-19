"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { MdGpsFixed, MdGpsOff, MdPlace, MdLocalShipping, MdCheckCircle, MdCancel, MdPhoneInTalk, MdNavigation, MdPhotoCamera, MdClose, MdCloudOff, MdWarningAmber } from "react-icons/md";
import { enqueueDelivery, enqueuePosition, flush, pendingCount } from "./outbox";

type Stop = { id: string; name: string; phone: string; address: string; lat: number | null; lng: number | null; result: "DELIVERED" | "FAILED" | null; reason: string | null };
type Info = { status: "PLANNED" | "IN_PROGRESS" | "DONE"; driver: string; plate: string; stops: Stop[] };

const REASONS: Record<string, string> = {
  CLIENTE_AUSENTE: "Cliente ausente",
  DIRECCION_INCORRECTA: "Dirección incorrecta",
  RECHAZADO: "Pedido rechazado",
  SIN_ACCESO: "Sin acceso",
  OTRO: "Otro",
};

// Reduce la foto antes de subirla: el celular entrega 5-12 MB y Vercel corta el body en 4,5 MB.
async function compressPhoto(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));
    if (blob) return new File([blob], "entrega.jpg", { type: "image/jpeg" });
  } catch { /* formato que el navegador no decodifica: se sube tal cual si es liviano */ }
  if (file.size > 4 * 1024 * 1024) throw new Error("No se pudo preparar la foto. Intenta tomarla de nuevo.");
  return file;
}

const SEND_EVERY_MS = 15_000;

export default function ConductorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const watchId = useRef<number | null>(null);
  const lastPostAt = useRef(0);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);
  const lastPos = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [sheet, setSheet] = useState<{ stop: Stop; mode: "DELIVERED" | "FAILED" } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const sendKey = useRef("");
  const lastFixAt = useRef(0);
  const [pendingPositions, setPendingPositions] = useState(0);
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [online, setOnline] = useState(true);
  const [tick, setTick] = useState(0);
  const [pauseNotice, setPauseNotice] = useState<string | null>(null);

  // Sin señal el fetch rechaza: se conserva lo último que se vio (y el service worker sirve la copia guardada).
  const load = useCallback(async () => {
    const res = await fetch(`/api/conductor/${token}`, { cache: "no-store" }).catch(() => null);
    if (!res) return;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? "Enlace inválido");
    else setInfo(json);
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const refreshPending = useCallback(async () => {
    const p = await pendingCount(token).catch(() => null);
    if (!p) return;
    setPendingPositions(p.positions);
    setQueued(new Set(p.deliveries.map((d) => d.orderId)));
  }, [token]);

  const flagKey = `kliniu_conductor_sharing_${token}`;
  const setFlag = useCallback((on: boolean) => {
    try { if (on) localStorage.setItem(flagKey, "1"); else localStorage.removeItem(flagKey); } catch { /* sin almacenamiento: solo no se reanuda solo */ }
  }, [flagKey]);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
    setSharing(false);
  }, []);

  useEffect(() => stop, [stop]);

  // Envía lo pendiente (entregas con foto y posiciones). Sin red no pasa nada: queda en la cola y se reintenta.
  const syncNow = useCallback(async () => {
    const r = await flush(token).catch(() => null);
    if (!r) return;
    if (r.sentPositions > 0) { setLastSent(new Date()); setMsg(null); }
    if (r.rejected.length > 0) setMsg(`No se pudo registrar una entrega: ${r.rejected[0].error}`);
    if (r.routeStopped) { setMsg("La ruta no está en curso."); setFlag(false); stop(); }
    if (r.sentDeliveries > 0 || r.rejected.length > 0 || r.routeStopped) void load();
    await refreshPending();
  }, [token, stop, load, refreshPending, setFlag]);

  // Al abrir (o recargar) se retoma lo que quedó sin enviar, y se mantiene al día con la red y la pantalla.
  useEffect(() => {
    const t0 = window.setTimeout(() => { setOnline(navigator.onLine); void refreshPending(); void syncNow(); }, 0);
    const onOnline = () => { setOnline(true); void syncNow(); };
    const onOffline = () => setOnline(false);
    const timer = window.setInterval(() => { setTick((n) => n + 1); void syncNow(); }, 15_000);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.clearTimeout(t0); window.clearInterval(timer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [syncNow, refreshPending]);

  // Service worker (solo producción): permite reabrir esta página sin señal.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-conductor.js", { scope: "/conductor/" }).catch(() => {});
    }
  }, []);

  const requestWakeLock = useCallback(() => {
    // Sin await: si el navegador no responde al wake lock, la UI no se queda esperando.
    const nav = navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => { wakeLock.current = l; }).catch(() => { /* sin wake lock: funciona mientras la pantalla esté encendida */ });
  }, []);

  const beginWatch = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        lastFixAt.current = Date.now();
        lastPos.current = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        if (Date.now() - lastPostAt.current < SEND_EVERY_MS) return;
        lastPostAt.current = Date.now();
        // Cada lectura entra a la cola con la hora del GPS; así un corte de señal no pierde recorrido.
        void enqueuePosition(token, {
          lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy,
          speed: p.coords.speed != null ? p.coords.speed * 3.6 : null, recordedAt: p.timestamp || Date.now(),
        }).then(() => syncNow()).catch(() => setMsg("No se pudo guardar la ubicación en el teléfono."));
      },
      (e) => {
        if (e.code === e.PERMISSION_DENIED) { setMsg("Permiso de ubicación denegado. Actívalo en el navegador (en iPhone: Ajustes > Safari > Ubicación)."); setFlag(false); stop(); return; }
        // Timeout / posición no disponible (vehículo quieto, túnel): el watch sigue vivo y reintenta solo.
        setMsg("Buscando señal de ubicación...");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [token, syncNow, stop, setFlag]);

  // Al volver a la pantalla: se suelta el wake lock al ocultarse, y el GPS puede quedar colgado tras una pausa.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void syncNow();
      if (!sharing) return;
      requestWakeLock();
      const gapMin = lastFixAt.current ? Math.round((Date.now() - lastFixAt.current) / 60000) : 0;
      if (gapMin >= 1) {
        setPauseNotice(`El seguimiento estuvo en pausa ${gapMin} min. Mantén la pantalla encendida y esta pestaña al frente.`);
        window.setTimeout(() => setPauseNotice(null), 20_000);
      }
      beginWatch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sharing, syncNow, requestWakeLock, beginWatch]);

  const start = async () => {
    setMsg(null);
    if (!("geolocation" in navigator)) return setMsg("Este dispositivo no permite compartir ubicación.");
    requestWakeLock();
    lastFixAt.current = Date.now();
    beginWatch();
    setSharing(true);
    setFlag(true);
  };

  // Si el conductor recarga o el navegador cierra la pestaña a mitad de ruta, el seguimiento se retoma solo
  // (el permiso de ubicación ya está concedido). Solo "Dejar de compartir" lo apaga de verdad.
  const autoResumed = useRef(false);
  useEffect(() => {
    if (autoResumed.current || info?.status !== "IN_PROGRESS" || sharing) return;
    let wanted = false;
    try { wanted = localStorage.getItem(flagKey) === "1"; } catch { /* nada */ }
    if (!wanted) return;
    autoResumed.current = true;
    const t = window.setTimeout(() => { void start(); }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.status, sharing, flagKey]);

  const openSheet = (stop: Stop, mode: "DELIVERED" | "FAILED") => {
    setSheet({ stop, mode });
    setPhoto(null);
    setPreview(null);
    setNote("");
    setReason("");
    setSheetError(null);
    sendKey.current = crypto.randomUUID();
  };
  const closeSheet = () => { if (!sending) { setSheet(null); if (preview) URL.revokeObjectURL(preview); } };

  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
    setSheetError(null);
  };

  // GPS de la entrega: la última lectura del watch, o una lectura puntual si no se está compartiendo.
  const currentPos = () =>
    lastPos.current
      ? Promise.resolve(lastPos.current)
      : new Promise<{ lat: number; lng: number; accuracy: number } | null>((resolve) =>
          navigator.geolocation?.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 },
          ) ?? resolve(null),
        );

  // La entrega se guarda en el teléfono y se envía sola: con o sin señal el conductor puede seguir con la ruta.
  const submitSheet = async () => {
    if (!sheet || sending) return;
    if (sheet.mode === "DELIVERED" && !photo) return setSheetError("Toma la foto de la entrega.");
    if (sheet.mode === "FAILED" && !reason) return setSheetError("Selecciona el motivo.");
    setSending(true);
    setSheetError(null);
    try {
      const pos = await currentPos();
      await enqueueDelivery(token, {
        id: sendKey.current,
        orderId: sheet.stop.id,
        outcome: sheet.mode,
        reason: sheet.mode === "FAILED" ? reason : undefined,
        note: note.trim() || undefined,
        photo: photo ? await compressPhoto(photo) : undefined,
        ...(pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : {}),
      });
      if (preview) URL.revokeObjectURL(preview);
      setSheet(null);
      await refreshPending();
      void syncNow();
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : "No se pudo guardar la entrega. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (error) return <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] p-6 text-center text-sm text-[#64748B]">{error}</main>;
  if (!info) return <main className="grid min-h-dvh place-items-center bg-[#F8FAFC] text-sm text-[#64748B]">Cargando...</main>;

  const canShare = info.status === "IN_PROGRESS";
  const attended = info.stops.filter((x) => x.result).length;
  const activeId = info.stops.find((x) => !x.result)?.id;
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-[#F8FAFC] p-4">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#0C535B]"><MdLocalShipping size={16} />Ruta de entrega</p>
        <p className="mt-1 text-lg font-black text-[#1A1A1A]">{info.driver}</p>
        <p className="text-sm text-[#64748B]">Vehículo {info.plate}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        {sharing ? (
          <>
            <p className="flex items-center gap-2 text-sm font-bold text-[#0C535B]"><MdGpsFixed size={18} />Compartiendo ubicación</p>
            <p className="mt-1 text-xs text-[#64748B]" data-tick={tick}>{lastSent ? `Último envío ${lastSent.toLocaleTimeString("es-CO")} (hace ${Math.max(0, Math.round((Date.now() - lastSent.getTime()) / 60000))} min)` : "Esperando primera lectura..."}</p>
            <p className="mt-1 text-xs text-[#64748B]">Mantén esta pantalla encendida y esta pestaña al frente. Si bloqueas el teléfono o abres otra app, el seguimiento se pausa.</p>
            <button onClick={() => { setFlag(false); stop(); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm font-bold text-[#475569]"><MdGpsOff size={18} />Dejar de compartir</button>
          </>
        ) : (
          <>
            <p className="text-sm text-[#64748B]">
              {canShare ? "Comparte tu ubicación para que la oficina siga la ruta en vivo." : info.status === "DONE" ? "La ruta ya finalizó." : "La ruta aún no ha iniciado. Espera a que la oficina la ponga en curso."}
            </p>
            {canShare && <button onClick={start} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-3 text-sm font-bold text-white"><MdGpsFixed size={18} />Compartir mi ubicación</button>}
          </>
        )}
        {msg && <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{msg}</p>}
      </div>

      {(!online || pendingPositions > 0 || queued.size > 0) && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs font-semibold text-[#92400E]" role="status">
          <MdCloudOff size={18} className="shrink-0" />
          <span>
            {!online ? "Sin conexión. " : "Enviando pendientes. "}
            {pendingPositions + queued.size > 0 ? `${pendingPositions + queued.size} por enviar (${queued.size} entrega${queued.size === 1 ? "" : "s"}); se envían solos al volver la señal.` : "Se enviará todo al volver la señal."}
          </span>
        </p>
      )}
      {pauseNotice && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-xs font-semibold text-[#92400E]" role="alert">
          <MdWarningAmber size={18} className="shrink-0" />{pauseNotice}
        </p>
      )}

      <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Paradas · {attended} de {info.stops.length} atendidas</p>
        {info.stops.length > 0 && attended === info.stops.length && (
          <p className="mt-2 rounded-xl bg-[#ECFDF5] px-3 py-2 text-xs font-semibold text-[#047857]">Ruta completa. La oficina la finalizará.</p>
        )}
        <ol className="mt-2 space-y-3">
          {info.stops.map((s, i) => {
            const active = canShare && s.id === activeId;
            return (
              <li key={s.id} className={`rounded-xl border p-3 text-sm ${active ? "border-[#27B1B8] bg-[#F0FDFA]" : "border-[#E2E8F0]"}`}>
                <div className="flex gap-2">
                  <MdPlace size={18} className="mt-0.5 shrink-0 text-[#27B1B8]" />
                  <span className="min-w-0">
                    <span className="font-semibold text-[#1A1A1A]">{i + 1}. {s.name}</span>
                    <span className="block text-xs text-[#64748B]">{s.address}</span>
                  </span>
                </div>
                {queued.has(s.id) && !s.result && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#92400E]"><MdCloudOff size={16} />Guardado, enviando...</p>}
                {s.result === "DELIVERED" && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#047857]"><MdCheckCircle size={16} />Entregado</p>}
                {s.result === "FAILED" && <p className="mt-2 flex items-center gap-1 text-xs font-bold text-[#B45309]"><MdCancel size={16} />No entregado{s.reason ? ` · ${REASONS[s.reason] ?? s.reason}` : ""}</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <a className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#475569]" target="_blank" rel="noreferrer"
                    href={s.lat != null && s.lng != null ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`}>
                    <MdNavigation size={16} />Navegar
                  </a>
                  {s.phone && <a className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#475569]" href={`tel:${s.phone}`}><MdPhoneInTalk size={16} />Llamar</a>}
                  {canShare && s.result !== "DELIVERED" && !queued.has(s.id) && (
                    <>
                      <button onClick={() => openSheet(s, "DELIVERED")} className="inline-flex items-center gap-1 rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white"><MdCheckCircle size={16} />Entregado</button>
                      {s.result !== "FAILED" && <button onClick={() => openSheet(s, "FAILED")} className="inline-flex items-center gap-1 rounded-lg border border-[#FDE68A] px-3 py-2 text-xs font-bold text-[#B45309]"><MdCancel size={16} />No entregado</button>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {info.stops.length === 0 && <li className="text-xs text-[#94A3B8]">Sin paradas asignadas.</li>}
        </ol>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog" aria-modal="true" aria-label={sheet.mode === "DELIVERED" ? "Confirmar entrega" : "Entrega fallida"}>
          <div className="mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-black text-[#1A1A1A]">{sheet.mode === "DELIVERED" ? "Confirmar entrega" : "No se pudo entregar"}</p>
                <p className="truncate text-xs text-[#64748B]">{sheet.stop.name} · {sheet.stop.address}</p>
              </div>
              <button onClick={closeSheet} aria-label="Cerrar" className="rounded-lg p-1 text-[#64748B]"><MdClose size={22} /></button>
            </div>

            {sheet.mode === "FAILED" && (
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(REASONS).map(([code, label]) => (
                  <button key={code} onClick={() => { setReason(code); setSheetError(null); }} aria-pressed={reason === code}
                    className={`rounded-full border px-3 py-2 text-xs font-bold ${reason === code ? "border-[#27B1B8] bg-[#F0FDFA] text-[#0C535B]" : "border-[#E2E8F0] text-[#475569]"}`}>{label}</button>
                ))}
              </div>
            )}

            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#CBD5E1] p-4 text-center text-xs font-bold text-[#475569]">
              {preview
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="Foto de la entrega" className="max-h-56 rounded-lg object-contain" />
                : <><MdPhotoCamera size={28} className="text-[#27B1B8]" />{sheet.mode === "DELIVERED" ? "Tomar foto de la entrega (obligatoria)" : "Tomar foto (opcional)"}</>}
              {preview && <span className="text-[#27B1B8]">Cambiar foto</span>}
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>

            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Nota (opcional)"
              className="mt-3 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />

            {sheetError && <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-xs text-[#DC2626]">{sheetError}</p>}

            <button onClick={submitSheet} disabled={sending || (sheet.mode === "DELIVERED" && !photo) || (sheet.mode === "FAILED" && !reason)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {sending ? "Guardando..." : sheet.mode === "DELIVERED" ? "Confirmar entrega" : "Registrar no entrega"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

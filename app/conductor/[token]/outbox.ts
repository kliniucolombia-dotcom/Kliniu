// Cola local (IndexedDB) de posiciones y entregas con foto: sobrevive a cortes de señal y a recargar la pestaña.
// Sin dependencias. Las entregas llevan una `key` idempotente y las posiciones un índice único en el servidor,
// así que reenviar tras un corte nunca duplica.

type PositionItem = {
  id: string; token: string; kind: "position"; createdAt: number;
  lat: number; lng: number; speed: number | null; accuracy: number | null; recordedAt: number;
};
export type DeliveryItem = {
  id: string; token: string; kind: "delivery"; createdAt: number;
  orderId: string; outcome: "DELIVERED" | "FAILED"; reason?: string; note?: string;
  lat?: number; lng?: number; accuracy?: number; photo?: Blob;
};
type Item = PositionItem | DeliveryItem;

const DB = "kliniu-conductor";
const STORE = "outbox";
const MAX_POSITIONS = 2000; // ~8 h a una lectura cada 15 s; se descartan las más viejas
const MAX_DELIVERIES = 30;
const BATCH = 100;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" }).createIndex("token", "token");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(r.result); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error); };
  }));
}

export async function list(token: string): Promise<Item[]> {
  const all = await tx("readonly", (s) => s.index("token").getAll(token) as IDBRequest<Item[]>);
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

async function remove(ids: string[]) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, "readwrite");
    ids.forEach((id) => t.objectStore(STORE).delete(id));
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error); };
  });
}

export async function enqueuePosition(token: string, p: Omit<PositionItem, "id" | "token" | "kind" | "createdAt">) {
  const positions = (await list(token)).filter((i): i is PositionItem => i.kind === "position");
  if (positions.length >= MAX_POSITIONS) await remove(positions.slice(0, positions.length - MAX_POSITIONS + 1).map((i) => i.id));
  await tx("readwrite", (s) => s.put({ ...p, id: crypto.randomUUID(), token, kind: "position", createdAt: Date.now() } satisfies PositionItem));
}

/** `id` es la llave idempotente de la entrega: un reintento con la misma llave no duplica en el servidor. */
export async function enqueueDelivery(token: string, d: Omit<DeliveryItem, "token" | "kind" | "createdAt">) {
  const deliveries = (await list(token)).filter((i) => i.kind === "delivery");
  if (deliveries.length >= MAX_DELIVERIES) throw new Error("Hay demasiadas entregas sin enviar. Conéctate a internet para sincronizar.");
  await tx("readwrite", (s) => s.put({ ...d, token, kind: "delivery", createdAt: Date.now() } satisfies DeliveryItem));
}

export type FlushResult = {
  sentPositions: number;
  sentDeliveries: number;
  /** Entregas descartadas por el servidor (ya entregado, pedido ajeno...) con el motivo para mostrar. */
  rejected: { orderId: string; error: string }[];
  routeStopped: boolean;
};

let flushing: Promise<FlushResult> | null = null;

/** Envía todo lo pendiente (una sola ejecución a la vez). Errores de red/5xx/429 dejan la cola intacta para reintentar. */
export function flush(token: string): Promise<FlushResult> {
  flushing ??= run(token).finally(() => { flushing = null; });
  return flushing;
}

async function run(token: string): Promise<FlushResult> {
  const res: FlushResult = { sentPositions: 0, sentDeliveries: 0, rejected: [], routeStopped: false };
  const items = await list(token);

  // Entregas primero (lo que el cliente espera ver), cada una con su foto.
  for (const d of items.filter((i): i is DeliveryItem => i.kind === "delivery")) {
    const form = new FormData();
    form.set("orderId", d.orderId); form.set("outcome", d.outcome); form.set("key", d.id);
    if (d.reason) form.set("reason", d.reason);
    if (d.note) form.set("note", d.note);
    if (d.photo) form.set("photo", d.photo, "entrega.jpg");
    if (d.lat != null && d.lng != null) { form.set("lat", String(d.lat)); form.set("lng", String(d.lng)); }
    if (d.accuracy != null) form.set("accuracy", String(d.accuracy));
    const r = await fetch(`/api/conductor/${token}/entrega`, { method: "POST", body: form }).catch(() => null);
    if (!r) return res; // sin red: se reintenta luego
    if (r.ok) { await remove([d.id]); res.sentDeliveries++; continue; }
    if (r.status === 409 || r.status === 400 || r.status === 404 || r.status === 413) {
      const j = await r.json().catch(() => ({}));
      await remove([d.id]);
      res.rejected.push({ orderId: d.orderId, error: j.error ?? "El servidor rechazó la entrega" });
      if (r.status === 409 && /no está en curso/i.test(j.error ?? "")) { res.routeStopped = true; return res; }
      continue;
    }
    return res; // 5xx / 429: reintentar luego
  }

  // Posiciones en lotes, de la más vieja a la más nueva.
  const positions = items.filter((i): i is PositionItem => i.kind === "position");
  for (let i = 0; i < positions.length; i += BATCH) {
    const chunk = positions.slice(i, i + BATCH);
    const r = await fetch(`/api/conductor/${token}/posicion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sentAt: Date.now(), positions: chunk.map(({ lat, lng, speed, accuracy, recordedAt }) => ({ lat, lng, speed, accuracy, recordedAt })) }),
    }).catch(() => null);
    if (!r) return res;
    if (r.ok) { await remove(chunk.map((c) => c.id)); res.sentPositions += chunk.length; continue; }
    if (r.status === 409) { await remove(positions.map((p) => p.id)); res.routeStopped = true; return res; }
    if (r.status === 400) { await remove(chunk.map((c) => c.id)); continue; } // lote inválido o demasiado viejo
    return res;
  }
  return res;
}

export async function pendingCount(token: string) {
  const items = await list(token);
  return { positions: items.filter((i) => i.kind === "position").length, deliveries: items.filter((i): i is DeliveryItem => i.kind === "delivery") };
}

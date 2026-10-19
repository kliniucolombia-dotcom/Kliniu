import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { FAIL_REASONS, recordDelivery, type FailReason } from "@/lib/logistics";
import { deleteDeliveryPhoto, uploadDeliveryPhoto } from "@/lib/delivery-photo";

const num = (v: FormDataEntryValue | null, min: number, max: number) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const text = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

// Público por token: registra "Entregado" (foto obligatoria) o "No entregado" (motivo obligatorio).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  const { token } = await params;
  if (!(await checkRateLimit(`conductor-entrega:${token}`, 30, 60_000))) {
    return Response.json({ error: "Demasiados envíos, espera un momento" }, { status: 429 });
  }

  const route = await prisma.deliveryRoute.findUnique({ where: { trackToken: token }, select: { id: true, status: true } });
  if (!route) return Response.json({ error: "Enlace inválido" }, { status: 404 });
  if (route.status !== "IN_PROGRESS") return Response.json({ error: "La ruta no está en curso", status: route.status }, { status: 409 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Formulario inválido" }, { status: 400 });

  const orderId = text(form.get("orderId"), 60);
  const key = text(form.get("key"), 80);
  const outcome = form.get("outcome");
  const reason = text(form.get("reason"), 40);
  const photo = form.get("photo");
  if (!orderId || !key || key.length < 8) return Response.json({ error: "Datos incompletos" }, { status: 400 });
  if (outcome !== "DELIVERED" && outcome !== "FAILED") return Response.json({ error: "Resultado inválido" }, { status: 400 });
  if (outcome === "DELIVERED" && !(photo instanceof File && photo.size > 0)) {
    return Response.json({ error: "La foto de entrega es obligatoria" }, { status: 400 });
  }
  if (outcome === "FAILED" && (!reason || !Object.hasOwn(FAIL_REASONS, reason))) {
    return Response.json({ error: "Indica el motivo" }, { status: 400 });
  }

  // Reintento de un envío ya guardado: responder OK sin subir la foto otra vez.
  if (await prisma.deliveryAttempt.findUnique({ where: { idempotencyKey: key }, select: { id: true } })) {
    return Response.json({ ok: true, duplicate: true });
  }

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await uploadDeliveryPhoto(photo, route.id, orderId);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "FILE_TOO_LARGE") return Response.json({ error: "La foto es muy pesada" }, { status: 413 });
      if (code === "INVALID_FILE_TYPE") return Response.json({ error: "El archivo no es una imagen válida" }, { status: 400 });
      console.error("DELIVERY_PHOTO_UPLOAD_FAILED", code);
      return Response.json({ error: "No se pudo guardar la foto" }, { status: 500 });
    }
  }

  try {
    const { duplicate } = await recordDelivery({
      routeId: route.id,
      orderId,
      outcome,
      reason: outcome === "FAILED" ? (reason as FailReason) : undefined,
      note: text(form.get("note"), 500),
      photoPath,
      lat: num(form.get("lat"), -90, 90),
      lng: num(form.get("lng"), -180, 180),
      accuracy: num(form.get("accuracy"), 0, 100000),
      idempotencyKey: key,
    });
    if (duplicate && photoPath) await deleteDeliveryPhoto(photoPath);
  } catch (e) {
    if (photoPath) await deleteDeliveryPhoto(photoPath);
    const code = e instanceof Error ? e.message : "";
    if (code === "ORDER_NOT_IN_ROUTE") return Response.json({ error: "Pedido no pertenece a esta ruta" }, { status: 404 });
    if (code === "ALREADY_DELIVERED") return Response.json({ error: "Este pedido ya fue entregado" }, { status: 409 });
    if (code === "ORDER_CANCELLED") return Response.json({ error: "Este pedido fue cancelado" }, { status: 409 });
    console.error("DELIVERY_RECORD_FAILED", code);
    return Response.json({ error: "No se pudo registrar la entrega" }, { status: 500 });
  }

  broadcastPanelUpdate("logistics").catch(() => {});
  return Response.json({ ok: true });
}

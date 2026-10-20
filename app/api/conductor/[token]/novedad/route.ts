import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createDriverIncident, DRIVER_INCIDENT_TYPES, type DriverIncidentType } from "@/lib/logistics";
import { deleteDeliveryPhoto, uploadDeliveryPhoto } from "@/lib/delivery-photo";

// Público por token: el conductor reporta una novedad (tipo de lista fija, detalle y foto opcionales).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  const { token } = await params;
  if (!(await checkRateLimit(`conductor-novedad:${token}`, 10, 60_000))) {
    return Response.json({ error: "Demasiados envíos, espera un momento" }, { status: 429 });
  }

  const route = await prisma.deliveryRoute.findUnique({ where: { trackToken: token }, select: { id: true, status: true } });
  if (!route) return Response.json({ error: "Enlace inválido" }, { status: 404 });
  if (route.status === "DONE") return Response.json({ error: "La ruta ya finalizó" }, { status: 409 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Formulario inválido" }, { status: 400 });
  const type = form.get("type");
  if (typeof type !== "string" || !Object.hasOwn(DRIVER_INCIDENT_TYPES, type)) return Response.json({ error: "Selecciona el tipo de novedad" }, { status: 400 });
  const description = typeof form.get("description") === "string" ? (form.get("description") as string).trim().slice(0, 500) : "";
  const photo = form.get("photo");

  let photoPath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    try {
      photoPath = await uploadDeliveryPhoto(photo, route.id, "novedad");
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "FILE_TOO_LARGE") return Response.json({ error: "La foto es muy pesada" }, { status: 413 });
      if (code === "INVALID_FILE_TYPE") return Response.json({ error: "El archivo no es una imagen válida" }, { status: 400 });
      console.error("INCIDENT_PHOTO_UPLOAD_FAILED", code);
      return Response.json({ error: "No se pudo guardar la foto" }, { status: 500 });
    }
  }

  try {
    await createDriverIncident({ routeId: route.id, type: type as DriverIncidentType, description, photoPath });
  } catch (e) {
    if (photoPath) await deleteDeliveryPhoto(photoPath);
    console.error("DRIVER_INCIDENT_FAILED", e instanceof Error ? e.message : "");
    return Response.json({ error: "No se pudo registrar la novedad" }, { status: 500 });
  }
  broadcastPanelUpdate("logistics").catch(() => {});
  return Response.json({ ok: true });
}

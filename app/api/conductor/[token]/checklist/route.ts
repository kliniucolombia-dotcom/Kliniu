import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { bogotaToday, checklistTemplateFor, parseBogotaDate } from "@/lib/logistics";

// Público por token: checklist pre-operacional F21 del día, hecho desde el celular antes de salir.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  const { token } = await params;
  if (!(await checkRateLimit(`conductor-checklist:${token}`, 10, 60_000))) {
    return Response.json({ error: "Demasiados envíos, espera un momento" }, { status: 429 });
  }

  const route = await prisma.deliveryRoute.findUnique({
    where: { trackToken: token },
    select: { status: true, driverId: true, createdById: true, vehicle: { select: { id: true, type: true } } },
  });
  if (!route) return Response.json({ error: "Enlace inválido" }, { status: 404 });
  if (route.status === "DONE") return Response.json({ error: "La ruta ya finalizó" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as { items?: Record<string, unknown>; initials?: unknown; notes?: unknown } | null;
  const template = checklistTemplateFor(route.vehicle.type);
  // Todos los ítems del formato deben venir marcados B / M / NA; no se aceptan claves ajenas.
  const items: Record<string, "B" | "M" | "NA"> = {};
  for (const it of template) {
    const v = body?.items?.[it.key];
    if (v !== "B" && v !== "M" && v !== "NA") return Response.json({ error: `Falta marcar: ${it.label}` }, { status: 400 });
    items[it.key] = v;
  }
  const initials = typeof body?.initials === "string" ? body.initials.trim().slice(0, 10) : undefined;
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) : undefined;

  // Solo crear: un enlace público nunca sobrescribe un checklist ya registrado (por otro conductor o desde el panel).
  // El índice único vehicleId+date cubre la carrera entre dos envíos simultáneos.
  try {
    await prisma.vehicleChecklistEntry.create({
      data: {
        vehicleId: route.vehicle.id,
        driverId: route.driverId,
        date: parseBogotaDate(bogotaToday()),
        items,
        initials: initials || null,
        notes: notes || null,
        createdById: route.createdById, // sin cuenta: a nombre de quien creó la ruta; el conductor queda en driverId
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return Response.json({ error: "El checklist de hoy ya fue registrado para este vehículo" }, { status: 409 });
    console.error("DRIVER_CHECKLIST_FAILED", e instanceof Error ? e.message : "");
    return Response.json({ error: "No se pudo guardar el checklist" }, { status: 500 });
  }
  broadcastPanelUpdate("logistics").catch(() => {});
  return Response.json({ ok: true, bad: Object.values(items).filter((v) => v === "M").length });
}

import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createDriver } from "@/lib/logistics";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { fullName?: string; phone?: string };
  if (!body.fullName?.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const driver = await createDriver({ fullName: body.fullName.trim(), phone: body.phone?.trim() || undefined });
  broadcastPanelUpdate("logistics").catch(() => {});
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "logistics.driver_create", entity: "driver", entityId: driver.id,
    meta: { name: driver.fullName }, ip: getClientIp(request),
  });
  return Response.json({ driver });
}

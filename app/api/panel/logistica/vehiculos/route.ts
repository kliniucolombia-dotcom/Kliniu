import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createVehicle } from "@/lib/logistics";
import type { VehicleType } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { plate?: string; type?: VehicleType };
  const validTypes: VehicleType[] = ["CAMIONETA", "MOTO", "FURGON", "CAMION"];
  if (!body.plate?.trim() || !body.type || !validTypes.includes(body.type)) {
    return Response.json({ error: "Faltan datos (plate, type)" }, { status: 400 });
  }

  try {
    const vehicle = await createVehicle({ plate: body.plate, type: body.type });
    broadcastPanelUpdate("logistics").catch(() => {});
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.vehicle_create", entity: "vehicle", entityId: vehicle.id,
      meta: { name: vehicle.plate, type: body.type }, ip: getClientIp(request),
    });

    return Response.json({ vehicle });
  } catch (error) {
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un vehículo con esa placa" : "No fue posible crear el vehículo" }, { status: 400 });
  }
}

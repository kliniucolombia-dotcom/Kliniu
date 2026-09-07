import { requirePermission } from "@/lib/permissions";
import { createVehicle } from "@/lib/logistics";
import type { VehicleType } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { plate?: string; type?: VehicleType };
  if (!body.plate?.trim() || (body.type !== "CAMIONETA" && body.type !== "MOTO")) {
    return Response.json({ error: "Faltan datos (plate, type)" }, { status: 400 });
  }

  try {
    const vehicle = await createVehicle({ plate: body.plate, type: body.type });
    return Response.json({ vehicle });
  } catch (error) {
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un vehículo con esa placa" : "No fue posible crear el vehículo" }, { status: 400 });
  }
}

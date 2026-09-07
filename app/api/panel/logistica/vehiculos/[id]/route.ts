import { requirePermission } from "@/lib/permissions";
import { updateVehicle } from "@/lib/logistics";
import type { VehicleType } from "@/generated/prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { plate?: string; type?: VehicleType; active?: boolean };
  const vehicle = await updateVehicle(id, body);
  return Response.json({ vehicle });
}

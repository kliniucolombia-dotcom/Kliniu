import { requirePermission } from "@/lib/permissions";
import { updateVehicle, deleteVehicle } from "@/lib/logistics";
import type { VehicleType } from "@/generated/prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as {
    plate?: string;
    type?: VehicleType;
    active?: boolean;
    soatDue?: string | null;
    technicalReviewDue?: string | null;
    policyDue?: string | null;
    operationCardDue?: string | null;
    extinguisherDue?: string | null;
  };
  const vehicle = await updateVehicle(id, body);
  return Response.json({ vehicle });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  try {
    await deleteVehicle(id);
    return Response.json({ ok: true });
  } catch (error) {
    const fk = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003";
    return Response.json({ error: fk ? "No se puede eliminar: tiene rutas, costos o checklists asociados" : "No fue posible eliminar el vehículo" }, { status: 400 });
  }
}

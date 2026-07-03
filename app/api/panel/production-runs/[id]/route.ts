import { requirePermission } from "@/lib/permissions";
import { deleteProductionRun, getProductionRunById, updateProductionRun, type ProductionRunWriteData } from "@/lib/panel";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const run = await getProductionRunById(id);
  if (!run) return Response.json({ error: "Corrida no encontrada" }, { status: 404 });
  return Response.json(run);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const body = await request.json() as Partial<Omit<ProductionRunWriteData, "productionDate" | "startTime" | "endTime">> & {
    productionDate?: string; startTime?: string; endTime?: string;
  };

  const { productionDate, startTime, endTime, ...rest } = body;
  const data: Partial<ProductionRunWriteData> = {
    ...rest,
    ...(productionDate !== undefined ? { productionDate: new Date(productionDate) } : {}),
    ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
    ...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
  };

  try {
    const updated = await updateProductionRun(id, data);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "DAMAGED_EXCEEDS_PRODUCED") {
      return Response.json({ error: "Las piezas dañadas no pueden superar la producción" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NON_CONFORMING_EXCEEDS_PRODUCED") {
      return Response.json({ error: "Las piezas no conformes no pueden superar la producción" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Corrida no encontrada" }, { status: 404 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    await deleteProductionRun(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

import { getSessionFromCookies } from "@/lib/auth";
import { deleteProductionRun, getProductionRunById, updateProductionRun, type ProductionRunWriteData } from "@/lib/panel";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const run = await getProductionRunById(id);
  if (!run) return Response.json({ error: "Corrida no encontrada" }, { status: 404 });
  return Response.json(run);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
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
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await deleteProductionRun(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

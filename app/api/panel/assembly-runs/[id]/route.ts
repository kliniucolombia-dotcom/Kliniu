import { requirePermission } from "@/lib/permissions";
import { deleteAssemblyRun, getAssemblyRunById, updateAssemblyRun, type AssemblyRunWriteData } from "@/lib/assembly";
import { assemblyErrorResponse } from "@/lib/assembly-errors";
import { isRecord, parseIsoDateTime, parseNonNegativeNumber, parseRequiredString } from "@/lib/operations-validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const run = await getAssemblyRunById(id);
  if (!run) return Response.json({ error: "Corrida no encontrada" }, { status: 404 });
  return Response.json(run);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_ENSAMBLE", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

  const numeric = ["assembled", "defective", "nonConforming", "reworked", "workerCount", "laborHours"] as const;
  const data: Partial<AssemblyRunWriteData> = {};
  try {
    for (const key of numeric) {
      if (body[key] !== undefined) data[key] = parseNonNegativeNumber(body[key]);
    }
    for (const key of ["productionDate", "startTime", "endTime"] as const) {
      if (body[key] !== undefined) data[key] = parseIsoDateTime(body[key]);
    }
    if (body.stationId !== undefined) data.stationId = parseRequiredString(body.stationId);
    if (body.leaderId !== undefined) data.leaderId = parseRequiredString(body.leaderId);
    if (body.orderNumber !== undefined) data.orderNumber = parseRequiredString(body.orderNumber);
    if (body.productId !== undefined) data.productId = parseRequiredString(body.productId);
    if (body.productionOrderId !== undefined) {
      data.productionOrderId = typeof body.productionOrderId === "string" && body.productionOrderId ? body.productionOrderId : null;
    }
    if (body.defectReason !== undefined) data.defectReason = typeof body.defectReason === "string" ? body.defectReason : null;
    if (body.observations !== undefined) data.observations = typeof body.observations === "string" ? body.observations : null;
  } catch {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    return Response.json(await updateAssemblyRun(id, data, access.user.id));
  } catch (e) {
    return assemblyErrorResponse(e);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_ENSAMBLE", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  try {
    await deleteAssemblyRun(id, access.user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return assemblyErrorResponse(e);
  }
}

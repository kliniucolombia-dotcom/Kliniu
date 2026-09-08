import { requirePermission } from "@/lib/permissions";
import { createAssemblyRun, getAssemblyRuns } from "@/lib/assembly";
import { assemblyErrorResponse } from "@/lib/assembly-errors";
import { isRecord, parseIsoDateTime, parseNonNegativeNumber, parseRequiredString } from "@/lib/operations-validation";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const params = new URL(request.url).searchParams;
  const runs = await getAssemblyRuns({
    stationId: params.get("stationId") ?? undefined,
    leaderId: params.get("leaderId") ?? undefined,
    productId: params.get("productId") ?? undefined,
    from: params.get("from") ? new Date(params.get("from")!) : undefined,
    to: params.get("to") ? new Date(params.get("to")!) : undefined,
  });
  return Response.json({ runs });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

  let data;
  try {
    data = {
      stationId: parseRequiredString(body.stationId),
      leaderId: parseRequiredString(body.leaderId),
      productId: parseRequiredString(body.productId),
      productionOrderId: typeof body.productionOrderId === "string" && body.productionOrderId ? body.productionOrderId : null,
      orderNumber: parseRequiredString(body.orderNumber),
      productionDate: parseIsoDateTime(body.productionDate),
      startTime: parseIsoDateTime(body.startTime),
      endTime: parseIsoDateTime(body.endTime),
      assembled: parseNonNegativeNumber(body.assembled),
      defective: body.defective === undefined ? 0 : parseNonNegativeNumber(body.defective),
      nonConforming: body.nonConforming === undefined ? 0 : parseNonNegativeNumber(body.nonConforming),
      reworked: body.reworked === undefined ? 0 : parseNonNegativeNumber(body.reworked),
      workerCount: parseNonNegativeNumber(body.workerCount),
      laborHours: parseNonNegativeNumber(body.laborHours),
      defectReason: typeof body.defectReason === "string" ? body.defectReason : null,
      observations: typeof body.observations === "string" ? body.observations : null,
    };
  } catch {
    return Response.json({ error: "Faltan campos requeridos o son inválidos" }, { status: 400 });
  }

  try {
    return Response.json(await createAssemblyRun(data, access.user.id), { status: 201 });
  } catch (e) {
    return assemblyErrorResponse(e);
  }
}

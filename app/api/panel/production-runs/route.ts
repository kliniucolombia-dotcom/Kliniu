import { getSessionFromCookies } from "@/lib/auth";
import { createProductionRun, getProductionRuns } from "@/lib/panel";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const machineId = params.get("machineId") ?? undefined;
  const operatorId = params.get("operatorId") ?? undefined;
  const from = params.get("from") ? new Date(params.get("from")!) : undefined;
  const to = params.get("to") ? new Date(params.get("to")!) : undefined;

  const runs = await getProductionRuns({ machineId, operatorId, from, to });
  return Response.json({ runs });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    machineId?: string; operatorId?: string; productId?: string | null; productionOrderId?: string | null; orderNumber?: string;
    productionDate?: string; startTime?: string; endTime?: string;
    material?: string; pigment?: string | null;
    injectionWeight?: number; pieceWeight?: number; cycle?: number; temperature?: number;
    produced?: number; damaged?: number; nonConforming?: number;
    couplingTest?: string | null; observations?: string | null;
  };

  if (!body.machineId || !body.operatorId || !body.orderNumber?.trim() || !body.productionDate || !body.startTime || !body.endTime) {
    return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!body.material?.trim() || body.injectionWeight === undefined || body.pieceWeight === undefined || body.cycle === undefined || body.temperature === undefined) {
    return Response.json({ error: "Faltan parámetros de producción" }, { status: 400 });
  }
  if (body.produced === undefined) {
    return Response.json({ error: "Cantidad producida requerida" }, { status: 400 });
  }
  const endTime = new Date(body.endTime);
  const startTime = new Date(body.startTime);
  if (endTime <= startTime) {
    return Response.json({ error: "La hora final debe ser posterior a la hora de inicio" }, { status: 400 });
  }

  try {
    const created = await createProductionRun({
      machineId: body.machineId,
      operatorId: body.operatorId,
      productId: body.productId ?? null,
      productionOrderId: body.productionOrderId ?? null,
      orderNumber: body.orderNumber,
      productionDate: new Date(body.productionDate),
      startTime,
      endTime,
      material: body.material,
      pigment: body.pigment,
      injectionWeight: body.injectionWeight,
      pieceWeight: body.pieceWeight,
      cycle: body.cycle,
      temperature: body.temperature,
      produced: body.produced,
      damaged: body.damaged,
      nonConforming: body.nonConforming,
      couplingTest: body.couplingTest,
      observations: body.observations,
    });
    return Response.json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "DAMAGED_EXCEEDS_PRODUCED") {
      return Response.json({ error: "Las piezas dañadas no pueden superar la producción" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NON_CONFORMING_EXCEEDS_PRODUCED") {
      return Response.json({ error: "Las piezas no conformes no pueden superar la producción" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

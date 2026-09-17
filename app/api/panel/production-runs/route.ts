import { requirePermission } from "@/lib/permissions";
import { createProductionRun, getProductionRuns, normalizeTemperatureZones } from "@/lib/panel";
import { parseIsoDateTime, parseNonNegativeNumber, parseEnum } from "@/lib/operations-validation";
import { COUPLING_STATUSES, CYCLE_UNITS, TEMPERATURE_TYPES } from "@/lib/production-calculator";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const params = new URL(request.url).searchParams;
  const machineId = params.get("machineId") ?? undefined;
  const operatorId = params.get("operatorId") ?? undefined;
  const from = params.get("from") ? new Date(params.get("from")!) : undefined;
  const to = params.get("to") ? new Date(params.get("to")!) : undefined;

  const runs = await getProductionRuns({ machineId, operatorId, from, to });
  return Response.json({ runs });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = await request.json().catch(() => ({})) as {
    machineId?: string; operatorId?: string; productId?: string | null; productionOrderId?: string | null; orderNumber?: string;
    productionDate?: string; startTime?: string; endTime?: string;
    material?: string; pigment?: string | null;
    pigmentQuantity?: number | null; pigmentColor?: string | null;
    injectionWeight?: number; pieceWeight?: number; cycle?: number; cycleUnit?: string;
    temperature?: number; temperatureType?: string; temperatureZones?: unknown;
    manualProductName?: string | null;
    produced?: number; damaged?: number; nonConforming?: number;
    couplingTest?: string | null; couplingStatus?: string | null; couplingTime?: string | null;
    observations?: string | null;
  };

  if (!body.machineId || !body.operatorId || !body.orderNumber?.trim() || !body.productionDate || !body.startTime || !body.endTime) {
    return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!body.material?.trim() || body.injectionWeight === undefined || body.pieceWeight === undefined || body.cycle === undefined || body.temperature === undefined) {
    return Response.json({ error: "Faltan parámetros de producción" }, { status: 400 });
  }
  if (!body.productId && !body.manualProductName?.trim()) {
    return Response.json({ error: "Selecciona o describe el producto" }, { status: 400 });
  }
  if (body.produced === undefined) {
    return Response.json({ error: "Cantidad producida requerida" }, { status: 400 });
  }
  let endTime: Date;
  let startTime: Date;
  let productionDate: Date;
  let cycleUnit: (typeof CYCLE_UNITS)[number];
  let temperatureType: (typeof TEMPERATURE_TYPES)[number];
  let couplingStatus: (typeof COUPLING_STATUSES)[number] | null;
  try {
    endTime = parseIsoDateTime(body.endTime);
    startTime = parseIsoDateTime(body.startTime);
    productionDate = parseIsoDateTime(body.productionDate);
    parseNonNegativeNumber(body.injectionWeight);
    parseNonNegativeNumber(body.pieceWeight);
    parseNonNegativeNumber(body.cycle);
    parseNonNegativeNumber(body.temperature);
    parseNonNegativeNumber(body.produced);
    if (body.damaged !== undefined) parseNonNegativeNumber(body.damaged);
    if (body.nonConforming !== undefined) parseNonNegativeNumber(body.nonConforming);
    if (body.pigmentQuantity !== undefined && body.pigmentQuantity !== null) parseNonNegativeNumber(body.pigmentQuantity);
    if (!Number.isInteger(body.produced) || (body.damaged !== undefined && !Number.isInteger(body.damaged)) || (body.nonConforming !== undefined && !Number.isInteger(body.nonConforming))) throw new Error("INVALID_NUMBER");
    cycleUnit = body.cycleUnit === undefined ? "seconds" : parseEnum(body.cycleUnit, CYCLE_UNITS);
    temperatureType = body.temperatureType === undefined ? "simple" : parseEnum(body.temperatureType, TEMPERATURE_TYPES);
    couplingStatus = body.couplingStatus === undefined || body.couplingStatus === null
      ? null
      : parseEnum(body.couplingStatus, COUPLING_STATUSES);
  } catch {
    return Response.json({ error: "Fechas o cantidades inválidas" }, { status: 400 });
  }
  if (endTime <= startTime) {
    return Response.json({ error: "La hora final debe ser posterior a la hora de inicio" }, { status: 400 });
  }
  const temperatureZones = temperatureType === "zones" ? normalizeTemperatureZones(body.temperatureZones) : [];

  try {
    const created = await createProductionRun({
      machineId: body.machineId,
      operatorId: body.operatorId,
      productId: body.productId ?? null,
      productionOrderId: body.productionOrderId ?? null,
      orderNumber: body.orderNumber,
      productionDate,
      startTime,
      endTime,
      material: body.material,
      pigment: body.pigment,
      pigmentQuantity: body.pigmentQuantity ?? null,
      pigmentColor: body.pigmentColor ?? null,
      injectionWeight: body.injectionWeight,
      pieceWeight: body.pieceWeight,
      cycle: body.cycle,
      cycleUnit,
      temperature: body.temperature,
      temperatureType,
      temperatureZones,
      manualProductName: body.manualProductName ?? null,
      produced: body.produced,
      damaged: body.damaged,
      nonConforming: body.nonConforming,
      couplingTest: body.couplingTest,
      couplingStatus,
      couplingTime: body.couplingTime ?? null,
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
    if (e instanceof Error && e.message === "DEFECTIVE_EXCEEDS_PRODUCED") {
      return Response.json({ error: "La suma de dañadas y no conformes no puede superar la producción" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

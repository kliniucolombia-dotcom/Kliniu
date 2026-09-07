import { requirePermission } from "@/lib/permissions";
import { createEquipment } from "@/lib/maintenance";
import type { EquipmentType } from "@/generated/prisma/client";

const TYPES: EquipmentType[] = ["MACHINE", "MOLD", "TOOL", "INFRA"];

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    name?: string;
    code?: string;
    type?: EquipmentType;
    location?: string;
    machineId?: string;
    moldId?: string;
  };
  if (!body.name?.trim() || !body.code?.trim() || !body.type || !TYPES.includes(body.type)) {
    return Response.json({ error: "Faltan datos (name, code, type)" }, { status: 400 });
  }

  try {
    const equipment = await createEquipment({ ...body, name: body.name, code: body.code, type: body.type });
    return Response.json({ equipment });
  } catch (error) {
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un equipo con ese código" : "No fue posible crear el equipo" }, { status: 400 });
  }
}

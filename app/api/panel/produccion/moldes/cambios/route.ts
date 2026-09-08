import { requirePermission } from "@/lib/permissions";
import { startMoldChange } from "@/lib/molds";

const ERRORS: Record<string, string> = {
  MACHINE_BUSY: "Esa máquina ya tiene un molde montado sin desmontar.",
  MOLD_NOT_AVAILABLE: "El molde no está disponible (en uso o en mantenimiento).",
};

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { machineId?: string; moldId?: string; notes?: string };
  if (!body.machineId || !body.moldId) {
    return Response.json({ error: "Faltan datos (machineId, moldId)" }, { status: 400 });
  }

  try {
    const change = await startMoldChange({ machineId: body.machineId, moldId: body.moldId, notes: body.notes, userId: access.user.id });
    return Response.json({ change });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    const duplicate = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
    return Response.json({ error: duplicate ? "La máquina o el molde ya tiene un montaje abierto." : ERRORS[key] ?? "No fue posible registrar el montaje" }, { status: duplicate ? 409 : 400 });
  }
}

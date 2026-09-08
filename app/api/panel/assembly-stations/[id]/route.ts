import { requirePermission } from "@/lib/permissions";
import { deleteAssemblyStation, updateAssemblyStation } from "@/lib/assembly";
import { assemblyErrorResponse } from "@/lib/assembly-errors";
import { isRecord, parsePositiveInteger, parseRequiredString } from "@/lib/operations-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_ENSAMBLE", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

  try {
    const station = await updateAssemblyStation(id, {
      ...(body.code !== undefined ? { code: parsePositiveInteger(body.code) } : {}),
      ...(body.name !== undefined ? { name: parseRequiredString(body.name) } : {}),
      ...(body.location !== undefined ? { location: typeof body.location === "string" ? body.location : null } : {}),
      ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
    });
    return Response.json(station);
  } catch (e) {
    return assemblyErrorResponse(e);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_ENSAMBLE", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  try {
    await deleteAssemblyStation(id);
    return Response.json({ ok: true });
  } catch (e) {
    return assemblyErrorResponse(e);
  }
}

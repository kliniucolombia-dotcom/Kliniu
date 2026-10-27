import { requirePermission } from "@/lib/permissions";
import { deleteMold, updateMold } from "@/lib/molds";
import { openMoldRepairOrder } from "@/lib/maintenance";
import type { MoldStatus } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

const STATUSES: MoldStatus[] = ["AVAILABLE", "IN_USE", "MAINTENANCE"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { code?: string; name?: string; status?: MoldStatus };
  if (body.status && !STATUSES.includes(body.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });

  const editsIdentity = body.code !== undefined || body.name !== undefined;
  if (editsIdentity) {
    // Corregir código/nombre del catálogo: solo jefe de operaciones y superadmin.
    if (access.user.role !== "JEFE_OPERACIONES" && access.user.role !== "SUPERADMIN") {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (body.code !== undefined && !body.code.trim()) return Response.json({ error: "El código es obligatorio" }, { status: 400 });
    if (body.name !== undefined && !body.name.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  try {
    const mold = await updateMold(id, body);
    if (body.status === "MAINTENANCE") {
      await openMoldRepairOrder(id, access.user.id);
      broadcastPanelUpdate("maintenance").catch(() => {});
    }
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ mold });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "MOUNT_REQUIRED") return Response.json({ error: "El estado En uso solo se asigna al montar el molde" }, { status: 409 });
    if (key === "MOLD_MOUNTED") return Response.json({ error: "Desmonta el molde antes de cambiar su estado" }, { status: 409 });
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    if (dup) return Response.json({ error: "Ya existe un molde con ese código" }, { status: 409 });
    return Response.json({ error: "No fue posible actualizar el molde" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (access.user.role !== "JEFE_OPERACIONES" && access.user.role !== "SUPERADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await deleteMold(id);
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "MOLD_MOUNTED") return Response.json({ error: "Desmonta el molde antes de eliminarlo." }, { status: 409 });
    if (key === "NOT_FOUND") return Response.json({ error: "Ese molde ya no existe." }, { status: 404 });
    return Response.json({ error: "No fue posible eliminar el molde" }, { status: 400 });
  }
}

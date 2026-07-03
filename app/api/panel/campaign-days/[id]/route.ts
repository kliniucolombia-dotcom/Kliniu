import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteCampaignDailyEntry, updateCampaignDailyEntry } from "@/lib/panel";

async function loadWithAccess(id: string, session: { role: string; userId: string }) {
  if (!prisma) return { error: "DB no disponible", status: 500 as const };
  const entry = await prisma.campaignDaily.findUnique({ where: { id }, include: { campaign: true } });
  if (!entry) return { error: "Registro no encontrado", status: 404 as const };
  if (session.role === "SELLER" && entry.campaign.sellerId !== session.userId) {
    return { error: "Sin permiso", status: 403 as const };
  }
  return { entry };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const body = await request.json() as {
    fecha?: string; mensajes?: number; transacciones?: number;
    presupuestoPublicidad?: number; ventaDelDia?: number;
  };

  try {
    const updated = await updateCampaignDailyEntry(id, body);
    return Response.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "FECHA_INVALIDA") return Response.json({ error: "Fecha inválida" }, { status: 400 });
    if (msg === "FECHA_DUPLICADA") return Response.json({ error: "Ya existe un registro para esa fecha" }, { status: 409 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  await deleteCampaignDailyEntry(id);
  return Response.json({ ok: true });
}

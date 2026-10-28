import { sellerBlockedFromCampaign, sellerHasFullAccess } from "@/lib/campaign-access";
import { requirePermission } from "@/lib/permissions";
import { logAudit, diffChanges } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { revalidateTag } from "next/cache";
import { DASHBOARD_STATS_TAG } from "@/lib/cache-tags";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Campaña no encontrada" }, { status: 404 });
  if (sellerBlockedFromCampaign(session, existing.sellerId)) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  // Reasignar el vendedor: solo roles no-SELLER o vendedores de acceso ampliado.
  const canReassign = session.role !== "SELLER" || sellerHasFullAccess(session.userId);
  const sellerId =
    canReassign && body.sellerId && body.sellerId !== existing.sellerId ? body.sellerId : existing.sellerId;

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      sellerId,
      investment: body.investment ?? existing.investment,
      sales: body.sales ?? existing.sales,
      leads: body.leads ?? existing.leads,
      targetMultiple: body.targetMultiple ?? existing.targetMultiple,
      platform: body.platform ?? existing.platform,
      notes: body.notes ?? existing.notes,
      status: body.status ?? existing.status,
      productId: body.productId !== undefined ? (body.productId || null) : existing.productId,
      comboId: body.comboId !== undefined ? (body.comboId || null) : existing.comboId,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate,
    },
  });

  const changes = diffChanges(existing, updated, ["name", "sellerId", "investment", "sales", "leads", "targetMultiple", "platform", "status", "productId", "comboId"]);
  if (Object.keys(changes).length) {
    await logAudit({
      actorId: session.userId, actorEmail: access.user.email, action: "campaign.update", entity: "campaign", entityId: id,
      meta: { name: updated.name, changes }, ip: getClientIp(request),
    });
  }
  broadcastPanelUpdate("campaigns").catch(() => {});

  revalidateTag(DASHBOARD_STATS_TAG, "max");

  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 503 });
  const { id } = await params;

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Campaña no encontrada" }, { status: 404 });
  if (sellerBlockedFromCampaign(session, existing.sellerId)) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  await prisma.campaign.delete({ where: { id } });
  await logAudit({
    actorId: session.userId, actorEmail: access.user.email, action: "campaign.delete", entity: "campaign", entityId: id,
    meta: { name: existing.name, status: existing.status }, ip: getClientIp(request),
  });
  broadcastPanelUpdate("campaigns").catch(() => {});
  revalidateTag(DASHBOARD_STATS_TAG, "max");
  return Response.json({ ok: true });
}

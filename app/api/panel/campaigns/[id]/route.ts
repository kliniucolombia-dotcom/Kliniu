import { requirePermission, requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Campaña no encontrada" }, { status: 404 });
  if (session.role === "SELLER" && existing.sellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      investment: body.investment ?? existing.investment,
      sales: body.sales ?? existing.sales,
      leads: body.leads ?? existing.leads,
      targetMultiple: body.targetMultiple ?? existing.targetMultiple,
      platform: body.platform ?? existing.platform,
      notes: body.notes ?? existing.notes,
      status: body.status ?? existing.status,
      productId: body.productId !== undefined ? (body.productId || null) : existing.productId,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "Solo ADMIN puede eliminar" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });
  const { id } = await params;
  await prisma.campaign.delete({ where: { id } });
  return Response.json({ ok: true });
}

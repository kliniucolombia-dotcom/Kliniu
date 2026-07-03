import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteSaleCalculatorItem, updateSaleCalculatorItem } from "@/lib/panel";

async function loadWithAccess(id: string, session: { role: string; userId: string }) {
  if (!prisma) return { error: "DB no disponible", status: 500 as const };
  const item = await prisma.saleCalculatorItem.findUnique({ where: { id }, include: { calculator: true } });
  if (!item) return { error: "Item no encontrado", status: 404 as const };
  if (item.calculator.userId !== session.userId) return { error: "Sin permiso", status: 403 as const };
  return { item };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const body = await request.json() as {
    productId?: string | null; nombreProducto?: string; cantidad?: number; costoUnitario?: number;
  };

  try {
    const updated = await updateSaleCalculatorItem(id, body);
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  await deleteSaleCalculatorItem(id);
  return Response.json({ ok: true });
}

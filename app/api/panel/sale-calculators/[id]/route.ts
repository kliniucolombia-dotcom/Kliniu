import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteSaleCalculator, getSaleCalculatorWithItems, updateSaleCalculator } from "@/lib/panel";

async function loadWithAccess(id: string, session: { role: string; userId: string }) {
  if (!prisma) return { error: "DB no disponible", status: 500 as const };
  const calc = await prisma.saleCalculator.findUnique({ where: { id } });
  if (!calc) return { error: "Calculadora no encontrada", status: 404 as const };
  if (calc.userId !== session.userId) return { error: "Sin permiso", status: 403 as const };
  return { calc };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const detail = await getSaleCalculatorWithItems(id);
  return Response.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const body = await request.json() as {
    name?: string; envio?: number; picking?: number; comisionPct?: number; margenPct?: number; campanaPct?: number;
  };

  try {
    const updated = await updateSaleCalculator(id, body);
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

  await deleteSaleCalculator(id);
  return Response.json({ ok: true });
}

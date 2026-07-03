import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteQuotation, getQuotationWithItems, updateQuotation } from "@/lib/panel";

async function loadWithAccess(id: string, session: { role: string; userId: string }) {
  if (!prisma) return { error: "DB no disponible", status: 500 as const };
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) return { error: "Cotización no encontrada", status: 404 as const };
  if (session.role !== "ADMIN" && quotation.sellerId !== session.userId) {
    return { error: "Sin permiso", status: 403 as const };
  }
  return { quotation };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const detail = await getQuotationWithItems(id);
  return Response.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  const body = await request.json() as {
    clientId?: string; paymentTerms?: string | null; notes?: string | null; validUntil?: string | null;
  };

  try {
    const updated = await updateQuotation(id, body);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;
  const scoped = await loadWithAccess(id, session);
  if ("error" in scoped) return Response.json({ error: scoped.error }, { status: scoped.status });

  try {
    await deleteQuotation(id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede borrar en borrador" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

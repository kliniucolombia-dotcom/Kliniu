import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteQuotationItem, updateQuotationItem } from "@/lib/panel";

async function checkAccess(itemId: string, session: { role: string; userId: string }) {
  if (!prisma) return { error: "DB no disponible", status: 500 as const };
  const item = await prisma.quotationItem.findUnique({ where: { id: itemId }, include: { quotation: true } });
  if (!item) return { error: "Ítem no encontrado", status: 404 as const };
  if (session.role !== "ADMIN" && item.quotation.sellerId !== session.userId) {
    return { error: "Sin permiso", status: 403 as const };
  }
  return { item };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const access = await checkAccess(id, session);
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  const body = await request.json() as {
    productId?: string | null; name?: string; reference?: string | null; manualImageUrl?: string | null; quantity?: number; unitPrice?: number;
  };

  try {
    const updated = await updateQuotationItem(id, body);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "PRODUCT_NOT_FOUND") {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const access = await checkAccess(id, session);
  if ("error" in access) return Response.json({ error: access.error }, { status: access.status });

  try {
    await deleteQuotationItem(id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

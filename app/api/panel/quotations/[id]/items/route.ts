import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createQuotationItem } from "@/lib/panel";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (session.role !== "ADMIN" && quotation.sellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await request.json() as {
    productId?: string | null; name?: string; reference?: string | null; manualImageUrl?: string | null;
    quantity?: number; unitPrice?: number;
  };

  try {
    const created = await createQuotationItem(id, body);
    return Response.json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "PRODUCT_NOT_FOUND") {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "NAME_REQUIRED") {
      return Response.json({ error: "Nombre requerido" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

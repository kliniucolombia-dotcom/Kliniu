import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { convertQuotationToOrder } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (session.role !== "ADMIN" && quotation.sellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const order = await convertQuotationToOrder(id);
    return Response.json(order);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede convertir desde aprobada" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "ALREADY_CONVERTED") {
      return Response.json({ error: "Ya fue convertida a pedido" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

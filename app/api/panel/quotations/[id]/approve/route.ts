import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { approveQuotation } from "@/lib/panel";

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
    const updated = await approveQuotation(id);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede aprobar desde enviada" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

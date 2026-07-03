import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendQuotation } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (session.role !== "ADMIN" && quotation.sellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const updated = await sendQuotation(id);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede enviar desde borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "NO_ITEMS") {
      return Response.json({ error: "Agrega al menos un ítem" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

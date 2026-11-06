import { sellerHasFullAccess } from "@/lib/campaign-access";
import { CoordinadoraError, getGuidePdf } from "@/lib/coordinadora";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Rótulos de varios pedidos en un solo PDF (2 por hoja carta): /api/panel/orders/etiquetas?ids=a,b,c */
export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 503 });

  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 100);
  if (!ids.length) return Response.json({ error: "Selecciona al menos un pedido" }, { status: 400 });

  const sellerOnly = access.session.role === "SELLER" && !sellerHasFullAccess(access.session.userId);
  const orders = await prisma.order.findMany({
    where: {
      id: { in: ids },
      carrier: "Coordinadora",
      trackingNumber: { not: null },
      ...(sellerOnly ? { assignedSellerId: access.session.userId } : {}),
    },
    select: { trackingNumber: true },
  });
  const guias = orders.map((o) => o.trackingNumber!).filter(Boolean);
  if (!guias.length) return Response.json({ error: "Ninguno de los pedidos tiene guía de Coordinadora" }, { status: 404 });

  try {
    const pdf = await getGuidePdf(guias);
    return new Response(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="rotulos-${guias.length}.pdf"` },
    });
  } catch (error) {
    const message = error instanceof CoordinadoraError ? error.message : "No fue posible conectar con Coordinadora";
    console.error("[coordinadora] rótulos", guias, error);
    return Response.json({ error: message }, { status: 502 });
  }
}

import { requirePermission } from "@/lib/permissions";
import { syncOrderToOdoo } from "@/lib/orders";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requirePermission("MODULE_PEDIDOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;

  try {
    const order = await syncOrderToOdoo(id);

    if (order.odooSyncStatus === "FAILED") {
      return Response.json(
        { error: order.odooSyncError || "No fue posible sincronizar con Odoo." },
        { status: 502 },
      );
    }

    return Response.json({
      odooOrderId: order.odooOrderId,
      odooOrderName: order.odooOrderName,
      odooSyncStatus: order.odooSyncStatus,
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "ORDER_NOT_FOUND" ? 404 : 500;
    const message =
      error instanceof Error && error.message === "ORDER_NOT_FOUND"
        ? "No encontramos ese pedido."
        : "No fue posible sincronizar con Odoo.";

    return Response.json({ error: message }, { status });
  }
}

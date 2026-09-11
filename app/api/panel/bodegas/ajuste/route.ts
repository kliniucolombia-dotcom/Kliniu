import { requirePermission } from "@/lib/permissions";
import { adjustWarehouseStock } from "@/lib/warehouses";
import { parsePositiveInteger } from "@/lib/operations-validation";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_BODEGAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    productId?: string;
    warehouseId?: string;
    type?: "ENTRADA" | "SALIDA";
    quantity?: number;
    note?: string;
  };

  if (!body.productId || !body.warehouseId || (body.type !== "ENTRADA" && body.type !== "SALIDA")) {
    return Response.json({ error: "Faltan datos (productId, warehouseId, type, quantity)" }, { status: 400 });
  }

  try {
    const quantity = parsePositiveInteger(body.quantity);
    const stock = await adjustWarehouseStock({
      productId: body.productId,
      warehouseId: body.warehouseId,
      type: body.type,
      quantity,
      userId: access.user.id,
      note: body.note,
    });

    createNotification({
      eventKey: "inventory.adjustment",
      title: `Ajuste de inventario: ${body.type === "ENTRADA" ? "entrada" : "salida"}`,
      detail: `${quantity} unidades`,
      href: "/panel/bodegas",
      createdById: access.user.id,
      metadata: { productId: body.productId, warehouseId: body.warehouseId, type: body.type, quantity },
    }).catch(() => {});

    return Response.json({ stock });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "No hay suficiente stock en esa bodega para esta salida."
        : "No fue posible registrar el movimiento.";
    return Response.json({ error: message }, { status: 400 });
  }
}

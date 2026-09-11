import { requirePermission } from "@/lib/permissions";
import { transferWarehouseStock } from "@/lib/warehouses";
import { parsePositiveInteger } from "@/lib/operations-validation";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_BODEGAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    productId?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity?: number;
    note?: string;
  };

  if (!body.productId || !body.fromWarehouseId || !body.toWarehouseId) {
    return Response.json(
      { error: "Faltan datos (productId, fromWarehouseId, toWarehouseId, quantity)" },
      { status: 400 },
    );
  }

  try {
    const quantity = parsePositiveInteger(body.quantity);
    const stock = await transferWarehouseStock({
      productId: body.productId,
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      quantity,
      userId: access.user.id,
      note: body.note,
    });

    createNotification({
      eventKey: "inventory.warehouse_transfer",
      title: "Transferencia entre bodegas",
      detail: `${quantity} unidades`,
      href: "/panel/bodegas",
      createdById: access.user.id,
      metadata: { productId: body.productId, from: body.fromWarehouseId, to: body.toWarehouseId, quantity },
    }).catch(() => {});

    return Response.json({ stock });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "No hay suficiente stock en la bodega de origen."
        : error instanceof Error && error.message === "SAME_WAREHOUSE"
          ? "La bodega de origen y destino no pueden ser la misma."
          : "No fue posible registrar la transferencia.";
    return Response.json({ error: message }, { status: 400 });
  }
}

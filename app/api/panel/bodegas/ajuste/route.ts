import { requirePermission } from "@/lib/permissions";
import { adjustWarehouseStock } from "@/lib/warehouses";

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

  if (!body.productId || !body.warehouseId || !body.type || !body.quantity) {
    return Response.json({ error: "Faltan datos (productId, warehouseId, type, quantity)" }, { status: 400 });
  }

  try {
    const stock = await adjustWarehouseStock({
      productId: body.productId,
      warehouseId: body.warehouseId,
      type: body.type,
      quantity: body.quantity,
      userId: access.user.id,
      note: body.note,
    });
    return Response.json({ stock });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "No hay suficiente stock en esa bodega para esta salida."
        : "No fue posible registrar el movimiento.";
    return Response.json({ error: message }, { status: 400 });
  }
}

import { requirePermission } from "@/lib/permissions";
import { getWarehouseMovements } from "@/lib/warehouses";

export async function GET(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const access = await requirePermission("MODULE_BODEGAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { productId } = await context.params;
  const movements = await getWarehouseMovements(productId);

  return Response.json({ movements });
}

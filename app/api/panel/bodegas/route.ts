import { requirePermission, getEffectivePermission } from "@/lib/permissions";
import { getWarehouses, listProductsWithWarehouseStock } from "@/lib/warehouses";

export async function GET() {
  const access = await requirePermission("MODULE_BODEGAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const [warehouses, products, permission] = await Promise.all([
    getWarehouses(),
    listProductsWithWarehouseStock(),
    getEffectivePermission(access.user, "MODULE_BODEGAS"),
  ]);

  return Response.json({ warehouses, products, canEdit: permission.canEdit });
}

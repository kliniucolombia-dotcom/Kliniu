import { getOdooProducts } from "@/lib/odoo";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ODOO", "view");
  if (!access.ok) {
    return Response.json({ error: "No autorizado." }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit") || "0");
    const limit = limitParam > 0 ? Math.min(limitParam, 5000) : 0;
    const products = await getOdooProducts(limit);

    return Response.json({ products });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ODOO_NOT_CONFIGURED"
        ? "Configura Odoo antes de consultar productos."
        : "No fue posible cargar productos desde Odoo.";

    const details =
      error instanceof Error && error.message !== "ODOO_NOT_CONFIGURED"
        ? error.message
        : undefined;

    return Response.json(
      details ? { error: message, details } : { error: message },
      { status: 500 },
    );
  }
}

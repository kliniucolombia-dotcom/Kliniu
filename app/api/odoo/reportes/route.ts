import { requirePermission } from "@/lib/permissions";
import { getOdooSalesReport } from "@/lib/odoo";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("MODULE_ODOO", "view");
    if (!access.ok) {
      return Response.json({ error: "No autorizado." }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const report = await getOdooSalesReport(searchParams.get("period"));

    return Response.json({ report });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ODOO_NOT_CONFIGURED"
        ? "Configura Odoo antes de consultar reportes."
        : "No fue posible cargar reportes desde Odoo.";

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

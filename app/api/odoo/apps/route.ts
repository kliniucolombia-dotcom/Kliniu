import { requirePermission } from "@/lib/permissions";
import { getOdooApps } from "@/lib/odoo";

export async function GET() {
  try {
    const access = await requirePermission("MODULE_ODOO", "view");
    if (!access.ok) {
      return Response.json({ error: "No autorizado." }, { status: access.status });
    }

    const apps = await getOdooApps();
    return Response.json({ apps });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ODOO_NOT_CONFIGURED"
        ? "Configura Odoo antes de consultar aplicaciones."
        : "No fue posible cargar las aplicaciones desde Odoo.";

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

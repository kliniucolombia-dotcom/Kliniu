import { getOdooConnectionStatus } from "@/lib/odoo";
import { requirePermission } from "@/lib/permissions";

function getOdooErrorResponse(error: unknown) {
  const message =
    error instanceof Error && error.message === "ODOO_NOT_CONFIGURED"
      ? "Configura ODOO_URL, ODOO_DB, ODOO_USERNAME y ODOO_API_KEY en .env.local."
      : error instanceof Error && error.message === "ODOO_AUTH_FAILED"
        ? "Odoo rechazó las credenciales. Revisa usuario, base de datos y API key."
        : "No fue posible conectar con Odoo.";

  const details =
    error instanceof Error &&
    !["ODOO_NOT_CONFIGURED", "ODOO_AUTH_FAILED"].includes(error.message)
      ? error.message
      : undefined;

  return Response.json(
    details
      ? { connected: false, error: message, details }
      : { connected: false, error: message },
    { status: 500 },
  );
}

export async function GET() {
  try {
    const access = await requirePermission("MODULE_ODOO", "view");
    if (!access.ok) {
      return Response.json({ error: "No autorizado." }, { status: access.status });
    }

    const status = await getOdooConnectionStatus();
    return Response.json(status);
  } catch (error) {
    return getOdooErrorResponse(error);
  }
}

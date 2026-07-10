import { requirePermission } from "@/lib/permissions";
import { syncStockFromOdoo } from "@/lib/products";

function getOdooErrorMessage(error: unknown) {
  return error instanceof Error && error.message === "ODOO_NOT_CONFIGURED"
    ? "Configura ODOO_URL, ODOO_DB, ODOO_USERNAME y ODOO_API_KEY en .env.local."
    : error instanceof Error && error.message === "ODOO_AUTH_FAILED"
      ? "Odoo rechazó las credenciales. Revisa usuario, base de datos y API key."
      : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
        ? "La base de datos no está configurada todavía."
        : "No fue posible sincronizar el stock con Odoo.";
}

export async function POST() {
  const access = await requirePermission("MODULE_ODOO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const result = await syncStockFromOdoo();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: getOdooErrorMessage(error) }, { status: 500 });
  }
}

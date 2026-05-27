import { getSessionFromCookies } from "@/lib/auth";
import { getOdooSalesReport } from "@/lib/odoo";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
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

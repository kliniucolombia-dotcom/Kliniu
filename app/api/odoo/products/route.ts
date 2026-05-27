import { getOdooProducts } from "@/lib/odoo";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "20") || 20, 1),
      100,
    );
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

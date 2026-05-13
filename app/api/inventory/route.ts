import { getRecentInventoryMovements } from "@/lib/products";
import { requireAdminUser } from "@/lib/admin";

export async function GET() {
  try {
    await requireAdminUser();
    const movements = await getRecentInventoryMovements();

    return Response.json({ movements });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? "No autorizado."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : "No fue posible cargar los movimientos de inventario.";

    const status =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? 401
        : 500;

    return Response.json({ error: message }, { status });
  }
}

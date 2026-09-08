import { adjustProductInventory } from "@/lib/products";
import { requirePermission } from "@/lib/permissions";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const access = await requirePermission("MODULE_PRODUCTOS", "edit");
    if (!access.ok) throw new Error(access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN");
    const { slug } = await context.params;
    const body = (await request.json()) as {
      quantity?: number;
      note?: string;
    };

    const product = await adjustProductInventory(
      slug,
      Number(body.quantity || 0),
      body.note,
    );

    return Response.json({ product });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? "No autorizado."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : error instanceof Error && error.message === "PRODUCT_NOT_FOUND"
            ? "No encontramos ese producto."
            : error instanceof Error && error.message === "INVALID_QUANTITY"
              ? "Indica una cantidad distinta de cero."
              : error instanceof Error && error.message === "INSUFFICIENT_STOCK"
                ? "No puedes dejar el stock por debajo de cero."
                : "No fue posible ajustar el inventario.";

    const status =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? 401
        : error instanceof Error &&
            (error.message === "INVALID_QUANTITY" ||
              error.message === "INSUFFICIENT_STOCK")
          ? 400
          : 500;

    return Response.json({ error: message }, { status });
  }
}

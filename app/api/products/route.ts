import { createProduct, getProducts } from "@/lib/products";
import { requireAnyPermission, requirePermission } from "@/lib/permissions";

function getProductErrorResponse(
  error: unknown,
  fallbackMessage: string,
  databaseMessage: string,
) {
  const message =
    error instanceof Error && error.message === "UNAUTHORIZED"
      ? "No autorizado."
      : error instanceof Error && error.message === "FORBIDDEN"
        ? "No tienes permiso para esta acción."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? databaseMessage
          : fallbackMessage;

  const status =
    error instanceof Error && error.message === "UNAUTHORIZED"
      ? 401
      : error instanceof Error && error.message === "FORBIDDEN"
        ? 403
        : 500;

  const details =
    error instanceof Error &&
    !["UNAUTHORIZED", "FORBIDDEN", "DATABASE_NOT_CONFIGURED"].includes(
      error.message,
    )
      ? error.message
      : undefined;

  return Response.json(
    details ? { error: message, details } : { error: message },
    { status },
  );
}

export async function GET() {
  const products = await getProducts();
  return Response.json({ products });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Un producto marcado como Outlet lo puede crear tanto quien administra
    // el catálogo como quien administra Outlet.
    const access = body?.isOutlet === true
      ? await requireAnyPermission([
          { module: "MODULE_OUTLET", action: "create" },
          { module: "MODULE_PRODUCTOS", action: "create" },
        ])
      : await requirePermission("MODULE_PRODUCTOS", "create");
    if (!access.ok) throw new Error(access.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN");

    const product = await createProduct(body, access.user.id);

    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return getProductErrorResponse(
      error,
      "No fue posible guardar el producto.",
      "Configura Supabase antes de crear productos desde el panel.",
    );
  }
}

import { createProduct, getProducts } from "@/lib/products";
import { requireAdminUser } from "@/lib/admin";

function getProductErrorResponse(
  error: unknown,
  fallbackMessage: string,
  databaseMessage: string,
) {
  const message =
    error instanceof Error &&
    (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
      ? "No autorizado."
      : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
        ? databaseMessage
        : fallbackMessage;

  const status =
    error instanceof Error &&
    (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
      ? 401
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
    await requireAdminUser();
    const body = await request.json();
    const product = await createProduct(body);

    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return getProductErrorResponse(
      error,
      "No fue posible guardar el producto.",
      "Configura Supabase antes de crear productos desde el panel.",
    );
  }
}

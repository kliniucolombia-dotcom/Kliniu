import {
  removeCartItemForUser,
  updateCartItemQuantityForUser,
} from "@/lib/cart";
import { getSessionFromCookies } from "@/lib/auth";

async function getSessionOrUnauthorized() {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrUnauthorized();
    const { id } = await context.params;
    const body = (await request.json()) as {
      action: "increment" | "decrement";
    };

    const items = await updateCartItemQuantityForUser(
      session.userId,
      id,
      body.action,
    );
    return Response.json({ items });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : "No fue posible actualizar el carrito.";

    return Response.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionOrUnauthorized();
    const { id } = await context.params;
    const items = await removeCartItemForUser(session.userId, id);
    return Response.json({ items });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : "No fue posible quitar el producto.";

    return Response.json({ error: message }, { status });
  }
}

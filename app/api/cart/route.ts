import {
  addCartItemForUser,
  addComboItemForUser,
  clearCartForUser,
  getCartItemsForUser,
} from "@/lib/cart";
import { getSessionFromCookies } from "@/lib/auth";

async function getSessionOrUnauthorized() {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function GET() {
  try {
    const session = await getSessionOrUnauthorized();
    const items = await getCartItemsForUser(session.userId);
    return Response.json({ items });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : "No fue posible cargar el carrito.";

    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionOrUnauthorized();
    const body = (await request.json()) as {
      id: string;
      nombre: string;
      precio: string;
      precioOriginal?: string;
      imagen: string;
      cantidad?: number;
      sku?: string;
      comboId?: string;
    };

    const items = body.comboId
      ? await addComboItemForUser(session.userId, body.comboId, body.cantidad)
      : await addCartItemForUser(session.userId, body);
    return Response.json({ items });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "COMBO_NOT_AVAILABLE"
          ? 409
          : 500;
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : error instanceof Error && error.message === "COMBO_NOT_AVAILABLE"
          ? "Este combo ya no está disponible."
          : "No fue posible actualizar el carrito.";

    return Response.json({ error: message }, { status });
  }
}

export async function DELETE() {
  try {
    const session = await getSessionOrUnauthorized();
    const items = await clearCartForUser(session.userId);
    return Response.json({ items });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : "No fue posible vaciar el carrito.";

    return Response.json({ error: message }, { status });
  }
}

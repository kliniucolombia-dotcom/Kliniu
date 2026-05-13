import {
  addCartItemForUser,
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
      imagen: string;
      cantidad?: number;
    };

    const items = await addCartItemForUser(session.userId, body);
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

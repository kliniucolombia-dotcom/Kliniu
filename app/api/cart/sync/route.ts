import { getSessionFromCookies } from "@/lib/auth";
import { syncCartItemsForUser, type PersistedCartItem } from "@/lib/cart";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      items?: PersistedCartItem[];
    };

    const items = await syncCartItemsForUser(session.userId, body.items || []);

    return Response.json({ items });
  } catch {
    return Response.json(
      { error: "No fue posible sincronizar el carrito." },
      { status: 500 },
    );
  }
}

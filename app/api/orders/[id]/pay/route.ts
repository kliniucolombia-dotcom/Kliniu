import { getSessionFromCookies } from "@/lib/auth";
import { setOrderWompiReference } from "@/lib/orders";
import { buildWompiCheckoutUrl } from "@/lib/wompi";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;

    const order = await setOrderWompiReference(id, session.userId);

    const origin = new URL(request.url).origin;
    const checkoutUrl = buildWompiCheckoutUrl({
      reference: order.wompiReference,
      amountInCents: order.subtotal * 100,
      redirectUrl: `${origin}/checkout/exito?pedido=${order.id}`,
      customerEmail: order.customerEmail,
    });

    return Response.json({ checkoutUrl });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "ORDER_NOT_FOUND"
        ? "No encontramos ese pedido para tu cuenta."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : error instanceof Error && error.message === "WOMPI_NOT_CONFIGURED"
            ? "La pasarela de pago no está configurada."
            : "No fue posible iniciar el pago.";

    const status =
      error instanceof Error && error.message === "ORDER_NOT_FOUND" ? 404 : 500;

    return Response.json({ error: message }, { status });
  }
}

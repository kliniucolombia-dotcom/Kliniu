import { revalidatePath } from "next/cache";
import { getSessionFromCookies } from "@/lib/auth";
import { confirmSimulatedOrderPayment } from "@/lib/orders";

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
    const body = (await request.json()) as {
      paymentCode?: string;
    };

    if (!id || !body.paymentCode?.trim()) {
      return Response.json(
        { error: "Ingresa el código de pago para continuar." },
        { status: 400 },
      );
    }

    const order = await confirmSimulatedOrderPayment(
      id,
      session.userId,
      body.paymentCode,
    );

    revalidatePath("/mi-cuenta");
    revalidatePath("/admin");

    return Response.json({
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingStatus: order.shippingStatus,
      },
      message: "Pago de prueba confirmado correctamente.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INVALID_PAYMENT_CODE"
        ? "El código de pago no es válido."
        : error instanceof Error && error.message === "ORDER_NOT_FOUND"
          ? "No encontramos ese pedido para tu cuenta."
          : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "La base de datos no está configurada todavía."
            : "No fue posible confirmar el pago.";

    const status =
      error instanceof Error && error.message === "INVALID_PAYMENT_CODE"
        ? 400
        : error instanceof Error && error.message === "ORDER_NOT_FOUND"
          ? 404
          : 500;

    return Response.json({ error: message }, { status });
  }
}

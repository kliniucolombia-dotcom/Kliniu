import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin";
import { updateOrderShipping } from "@/lib/orders";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminUser();

    const { id } = await params;
    const body = (await request.json()) as {
      shippingStatus?: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
      paymentStatus?: "PENDING" | "PAID" | "FAILED";
      carrier?: string;
      trackingNumber?: string;
      adminNotes?: string;
    };

    if (!id || !body.shippingStatus) {
      return Response.json(
        { error: "Pedido y estado de envío son obligatorios." },
        { status: 400 },
      );
    }

    const order = await updateOrderShipping(id, {
      shippingStatus: body.shippingStatus,
      paymentStatus: body.paymentStatus,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
      adminNotes: body.adminNotes,
    });

    revalidatePath("/mi-cuenta");
    revalidatePath("/admin");

    return Response.json({
      order,
      message: "Pedido actualizado correctamente.",
    });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "FORBIDDEN"
          ? 403
          : error instanceof Error && error.message === "ORDER_NOT_FOUND"
            ? 404
            : error instanceof Error &&
                (error.message === "INVALID_SHIPPING_STATUS" ||
                  error.message === "INVALID_PAYMENT_STATUS")
              ? 400
              : 500;

    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : error instanceof Error && error.message === "FORBIDDEN"
          ? "No tienes permisos para actualizar pedidos."
          : error instanceof Error && error.message === "ORDER_NOT_FOUND"
            ? "No encontramos ese pedido."
            : error instanceof Error && error.message === "INVALID_SHIPPING_STATUS"
              ? "El estado de envío no es válido."
              : error instanceof Error && error.message === "INVALID_PAYMENT_STATUS"
                ? "El estado de pago no es válido."
                : "No fue posible actualizar el pedido.";

    return Response.json({ error: message }, { status });
  }
}

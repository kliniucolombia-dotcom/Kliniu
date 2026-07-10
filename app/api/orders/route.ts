import { getSessionFromCookies } from "@/lib/auth";
import { requireAdminUser } from "@/lib/admin";
import { createOrderFromCart, getAllOrders } from "@/lib/orders";
import { earnPointsForOrder } from "@/lib/points";

export async function GET() {
  try {
    await requireAdminUser();
    const orders = await getAllOrders();

    return Response.json({ orders });
  } catch (error) {
    const status =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? 401
        : error instanceof Error && error.message === "FORBIDDEN"
          ? 403
          : 500;

    const message =
      error instanceof Error && error.message === "UNAUTHORIZED"
        ? "No autorizado."
        : error instanceof Error && error.message === "FORBIDDEN"
          ? "No tienes permisos para ver pedidos."
          : "No fue posible cargar los pedidos.";

    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookies();

    if (!session) {
      return Response.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      company?: string;
      department?: string;
      city?: string;
      addressLine1?: string;
      addressLine2?: string;
      notes?: string;
    };

    const order = await createOrderFromCart(session.userId, {
      customerName: body.customerName || "",
      customerEmail: body.customerEmail || "",
      customerPhone: body.customerPhone || "",
      company: body.company,
      department: body.department || "",
      city: body.city || "",
      addressLine1: body.addressLine1 || "",
      addressLine2: body.addressLine2,
      notes: body.notes,
    });

    // Acumular puntos: 1 punto por cada $1.000 COP del subtotal
    await earnPointsForOrder(session.userId, order.subtotal, order.id).catch(() => {});

    return Response.json({
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalItems: order.totalItems,
        subtotal: order.subtotal,
        createdAt: order.createdAt,
      },
      message: "Pedido creado correctamente.",
    });
  } catch (error) {
    const isProductNotFound =
      error instanceof Error && error.message.startsWith("PRODUCT_NOT_FOUND");
    const missingProductName = isProductNotFound
      ? (error as Error).message.split(":").slice(1).join(":").trim()
      : "";

    const message =
      error instanceof Error && error.message === "INVALID_CHECKOUT"
        ? "Completa los datos principales de entrega para continuar."
        : error instanceof Error && error.message === "EMPTY_CART"
          ? "Tu carrito está vacío en este momento."
          : isProductNotFound
            ? missingProductName
              ? `"${missingProductName}" ya no está disponible en el catálogo. Quítalo del carrito para continuar.`
              : "Uno de los productos ya no está disponible en el catálogo."
          : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "La base de datos no está configurada todavía."
            : "No fue posible crear el pedido.";

    const status =
      error instanceof Error && error.message === "INVALID_CHECKOUT"
        ? 400
        : error instanceof Error && error.message === "EMPTY_CART"
          ? 400
          : isProductNotFound
            ? 409
          : 500;

    return Response.json({ error: message }, { status });
  }
}

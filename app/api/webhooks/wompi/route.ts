import { revalidatePath } from "next/cache";
import { markOrderPaidByWompiReference } from "@/lib/orders";
import { verifyWompiEventSignature, verifyWompiTransactionStatus, type WompiEventPayload } from "@/lib/wompi";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { sendOrderPaidEmail } from "@/lib/notifications/order-email";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const payload = (await request.json()) as WompiEventPayload;

  if (!verifyWompiEventSignature(payload)) {
    return Response.json({ error: "Firma inválida." }, { status: 401 });
  }

  if (payload.event !== "transaction.updated") {
    return Response.json({ received: true });
  }

  const { reference, id, status } = payload.data.transaction;

  try {
    // Defensa en profundidad: reconfirmar contra el API de Wompi en vez de
    // confiar únicamente en el payload firmado del webhook.
    const verified = await verifyWompiTransactionStatus(id);
    if (verified.reference !== reference || verified.status !== status) {
      console.error("WOMPI_WEBHOOK_STATUS_MISMATCH", { reference, id, status, verified });
      return Response.json({ error: "Estado no coincide con el API de Wompi." }, { status: 409 });
    }

    await markOrderPaidByWompiReference(reference, id, status as "APPROVED" | "DECLINED" | "VOIDED" | "ERROR");
    revalidatePath("/mi-cuenta");
    revalidatePath("/admin");
    await broadcastPanelUpdate("orders");

    if (status === "APPROVED") {
      createNotification({
        eventKey: "order.paid",
        title: "Pedido pagado",
        detail: `Referencia: ${reference}`,
        href: "/panel/pedidos",
        metadata: { reference, transactionId: id },
      }).catch(() => {});

      prisma
        ?.order.findUnique({ where: { wompiReference: reference }, include: { items: true } })
        .then((order) => order && sendOrderPaidEmail(order))
        .catch(() => {});
    }
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") {
      // Referencia desconocida: no es un error transitorio, no reintentar.
      return Response.json({ received: true });
    }

    // Error real (DB caída, API de Wompi caída, etc): que Wompi reintente.
    console.error("WOMPI_WEBHOOK_FAILED", error);
    return Response.json({ error: "No fue posible procesar el evento." }, { status: 500 });
  }

  return Response.json({ received: true });
}

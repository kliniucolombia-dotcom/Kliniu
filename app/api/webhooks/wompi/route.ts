import { revalidatePath } from "next/cache";
import { markOrderPaidByWompiReference } from "@/lib/orders";
import { verifyWompiEventSignature, type WompiEventPayload } from "@/lib/wompi";

export async function POST(request: Request) {
  const payload = (await request.json()) as WompiEventPayload;

  if (!verifyWompiEventSignature(payload)) {
    return Response.json({ error: "Firma inválida." }, { status: 401 });
  }

  if (payload.event === "transaction.updated") {
    const { reference, id, status } = payload.data.transaction;

    try {
      await markOrderPaidByWompiReference(reference, id, status as "APPROVED" | "DECLINED" | "VOIDED" | "ERROR");
      revalidatePath("/mi-cuenta");
      revalidatePath("/admin");
    } catch {
      // Referencia no encontrada u otro error: Wompi reintenta, respondemos 200 igual.
    }
  }

  return Response.json({ received: true });
}

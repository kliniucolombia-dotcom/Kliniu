import { verifyWebhookSignature, parseWebhookEvent } from "@/lib/kommo";
import type { KommoWebhookEvent } from "@/lib/kommo";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-kommo-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const event = parseWebhookEvent(body);
  if (!event) {
    return Response.json({ error: "Unrecognized event." }, { status: 400 });
  }

  // Route events to handlers — implemented in Fase 4
  await handleWebhookEvent(event);

  return Response.json({ ok: true });
}

async function handleWebhookEvent(event: KommoWebhookEvent): Promise<void> {
  // Fase 4: register handlers here
  // Example: event.leads?.status → update Order.shippingStatus
  void event;
}

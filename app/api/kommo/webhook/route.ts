import { createHash } from "node:crypto";
import { verifyWebhookSignature, parseWebhookEvent } from "@/lib/kommo";
import type { KommoWebhookEvent } from "@/lib/kommo";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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

  await handleWebhookEvent(event, rawBody);

  return Response.json({ ok: true });
}

type WebhookItem = { kind: string; kommoId: number };

function summarizeEvent(event: KommoWebhookEvent): WebhookItem[] {
  const items: WebhookItem[] = [];
  for (const kind of ["add", "update", "delete", "status"] as const) {
    for (const lead of event.leads?.[kind] ?? []) items.push({ kind: `leads.${kind}`, kommoId: lead.id });
  }
  for (const kind of ["add", "update"] as const) {
    for (const contact of event.contacts?.[kind] ?? []) items.push({ kind: `contacts.${kind}`, kommoId: contact.id });
  }
  return items;
}

// Solo bitácora: Kommo no cambia el estado de pago ni de envío de los pedidos
// (eso viene únicamente de Wompi). Se registra una fila por evento, deduplicada
// por el hash del cuerpo: los reintentos de Kommo no generan filas repetidas.
async function handleWebhookEvent(event: KommoWebhookEvent, rawBody: string): Promise<void> {
  if (!prisma) return;

  const eventHash = createHash("sha256").update(rawBody).digest("hex");
  const existing = await prisma.kommoSyncLog.findFirst({
    where: { entityType: "kommo_webhook", entityId: eventHash },
    select: { id: true },
  });
  if (existing) return;

  const items = summarizeEvent(event);
  await prisma.kommoSyncLog.create({
    data: {
      entityType: "kommo_webhook",
      entityId: eventHash,
      kommoId: items[0]?.kommoId ?? null,
      operation: items.map((item) => item.kind).join(",") || "unknown",
      status: "SUCCESS",
      syncedAt: new Date(),
      payload: { account: event.account, events: items } as unknown as Prisma.InputJsonValue,
    },
  });
}

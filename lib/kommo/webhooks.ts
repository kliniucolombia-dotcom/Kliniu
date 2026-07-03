import { createHmac, timingSafeEqual } from "crypto";
import type { KommoWebhookEvent } from "./types";

export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.KOMMO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[kommo] KOMMO_WEBHOOK_SECRET not set — skipping webhook verification");
    return false;
  }

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(signatureHeader.toLowerCase(), "hex");
  const b = Buffer.from(expected.toLowerCase(), "hex");

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export function parseWebhookEvent(body: unknown): KommoWebhookEvent | null {
  if (!body || typeof body !== "object") return null;
  return body as KommoWebhookEvent;
}

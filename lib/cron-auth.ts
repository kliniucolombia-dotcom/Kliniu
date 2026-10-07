import { timingSafeEqual } from "node:crypto";

// Autorización de los endpoints de cron. Compara en tiempo constante para no
// filtrar el secreto por el tiempo de respuesta. Sin CRON_SECRET falla cerrado.
export function hasValidCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");

  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

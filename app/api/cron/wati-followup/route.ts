import { sendPendingWatiFollowUps } from "@/lib/wati-followup";

export const maxDuration = 60;

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return Response.json(await sendPendingWatiFollowUps());
  } catch (error) {
    console.error("WATI_FOLLOW_UP_CRON_FAILED", error);
    return Response.json({ error: "No fue posible enviar los seguimientos." }, { status: 500 });
  }
}

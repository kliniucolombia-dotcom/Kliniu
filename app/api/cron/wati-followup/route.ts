import { remindUnattendedEscalations } from "@/lib/wati-escalation";
import { sendPendingWatiFollowUps } from "@/lib/wati-followup";
import { hasValidCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const followUps = await sendPendingWatiFollowUps();
    // Independiente del remarketing: no debe caerse el cron si falla el recordatorio.
    const advisorReminders = await remindUnattendedEscalations().catch((error) => {
      console.error("WATI_ADVISOR_REMINDER_FAILED", error);
      return { reminded: 0 };
    });
    return Response.json({ ...followUps, advisorReminders });
  } catch (error) {
    console.error("WATI_FOLLOW_UP_CRON_FAILED", error);
    return Response.json({ error: "No fue posible enviar los seguimientos." }, { status: 500 });
  }
}

import { runLessonsAnalysis } from "@/lib/wati-lessons";
import { hasValidCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return Response.json(await runLessonsAnalysis({ days: 30, limit: 12 }));
  } catch (error) {
    console.error("WATI_LESSONS_CRON_FAILED", error);
    return Response.json({ error: "No fue posible analizar las conversaciones." }, { status: 500 });
  }
}

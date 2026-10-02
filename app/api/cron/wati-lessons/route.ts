import { runLessonsAnalysis } from "@/lib/wati-lessons";

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
    return Response.json(await runLessonsAnalysis({ days: 30, limit: 12 }));
  } catch (error) {
    console.error("WATI_LESSONS_CRON_FAILED", error);
    return Response.json({ error: "No fue posible analizar las conversaciones." }, { status: 500 });
  }
}

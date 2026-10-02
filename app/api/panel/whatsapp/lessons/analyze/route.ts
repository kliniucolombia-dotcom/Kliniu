import { requirePermission } from "@/lib/permissions";
import { runLessonsAnalysis } from "@/lib/wati-lessons";

export const maxDuration = 60;

export async function POST() {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (access.user.role !== "SUPERADMIN") return Response.json({ error: "Solo el superadmin puede lanzar el análisis" }, { status: 403 });

  try {
    return Response.json(await runLessonsAnalysis({ days: 30, limit: 12 }));
  } catch (error) {
    console.error("WATI_LESSONS_ANALYSIS_FAILED", error);
    return Response.json({ error: "No fue posible analizar las conversaciones." }, { status: 500 });
  }
}

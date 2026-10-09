import { archiveStaleWatiConversations } from "@/lib/wati-conversations";
import { hasValidCronSecret } from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return Response.json(await archiveStaleWatiConversations());
  } catch (error) {
    console.error("WATI_ARCHIVE_CRON_FAILED", error);
    return Response.json({ error: "No fue posible archivar las conversaciones." }, { status: 500 });
  }
}

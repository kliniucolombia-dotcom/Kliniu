import { requirePermission } from "@/lib/permissions";
import { getAllWatiConversations } from "@/lib/wati-conversations";

export async function GET() {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const conversations = await getAllWatiConversations();
  return Response.json(conversations);
}

import { requirePermission } from "@/lib/permissions";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { bulkUpdateWatiConversations, type BulkConversationAction } from "@/lib/wati-conversations";

const ACTIONS: BulkConversationAction[] = ["archive", "unarchive", "delete"];
const MAX_IDS = 500;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { ids?: unknown; action?: unknown };
  const action = body.action as BulkConversationAction;
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === "string"))] : [];
  if (!ACTIONS.includes(action) || ids.length === 0 || ids.length > MAX_IDS) {
    return Response.json({ error: "Selección no válida." }, { status: 400 });
  }

  const access = await requirePermission("MODULE_WHATSAPP", action === "delete" ? "delete" : "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const count = await bulkUpdateWatiConversations(ids, action);
    await broadcastPanelUpdate("wati");
    return Response.json({ count });
  } catch {
    return Response.json({ error: "No fue posible completar la acción." }, { status: 500 });
  }
}

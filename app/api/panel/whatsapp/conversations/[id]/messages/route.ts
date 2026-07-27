import { requirePermission } from "@/lib/permissions";
import { getWatiConversationMessages, sendAgentReply } from "@/lib/wati-conversations";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;

  try {
    const conversation = await getWatiConversationMessages(id);
    return Response.json(conversation);
  } catch {
    return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { text?: string };

  if (!body.text?.trim()) {
    return Response.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  try {
    const message = await sendAgentReply(id, body.text.trim());
    await broadcastPanelUpdate("wati");
    return Response.json(message);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const message = detail.startsWith("WATI_SEND_FAILED")
      ? "La ventana de 24 horas está cerrada. Usa “Nuevo chat” y envía una plantilla aprobada."
      : detail || "No fue posible enviar el mensaje";
    return Response.json({ error: message }, { status: 500 });
  }
}

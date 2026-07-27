import { requirePermission } from "@/lib/permissions";
import { broadcastPanelUpdate } from "@/lib/realtime";
import {
  updateWatiConversationNotes,
  updateWatiConversationBotPaused,
  updateWatiConversationStage,
  WATI_SALES_STAGES,
} from "@/lib/wati-conversations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { salesStage?: string; notes?: string; botPaused?: boolean };
  const hasStage = typeof body.salesStage === "string";
  const hasNotes = typeof body.notes === "string";
  const hasBotPaused = typeof body.botPaused === "boolean";
  if (!hasStage && !hasNotes && !hasBotPaused) return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
  if (hasStage && !WATI_SALES_STAGES.includes(body.salesStage as (typeof WATI_SALES_STAGES)[number])) {
    return Response.json({ error: "Etapa comercial no válida." }, { status: 400 });
  }

  try {
    const conversation = hasStage
      ? await updateWatiConversationStage(id, body.salesStage as (typeof WATI_SALES_STAGES)[number])
      : hasNotes
        ? await updateWatiConversationNotes(id, body.notes!)
        : await updateWatiConversationBotPaused(id, body.botPaused!);
    await broadcastPanelUpdate("wati");
    return Response.json(conversation);
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_LINKED_STAGE_LOCKED") {
      return Response.json(
        { error: "Este chat tiene un pedido. Usa “Reactivar IA” para iniciar una venta nueva." },
        { status: 409 },
      );
    }
    return Response.json({ error: "Conversación no encontrada." }, { status: 404 });
  }
}

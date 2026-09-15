import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { recordTicketEvent } from "@/lib/ticket-events";
import { canManageTicket } from "@/lib/ticket-access";

const BUCKET = "rrhh-soportes";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id, attachmentId } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });
  if (!(await canManageTicket(access.user, ticket))) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const attachment = await prisma.ticketAttachment.findFirst({ where: { id: attachmentId, ticketId: id } });
  if (!attachment) return Response.json({ error: "Adjunto no encontrado" }, { status: 404 });

  await prisma.ticketAttachment.delete({ where: { id: attachment.id } });

  if (attachment.url.startsWith("tickets/")) {
    const supabase = createSupabaseStorageClient();
    if (supabase) {
      try {
        await supabase.storage.from(BUCKET).remove([attachment.url]);
      } catch {
        // Ignorar: el registro ya fue eliminado.
      }
    }
  }

  await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "ATTACHMENT_DELETED", toValue: attachment.name });
  await broadcastPanelUpdate("tickets");
  return Response.json({ ok: true });
}

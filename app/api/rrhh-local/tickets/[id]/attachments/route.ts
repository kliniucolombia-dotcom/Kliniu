import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { recordTicketEvent } from "@/lib/ticket-events";
import { canManageTicket } from "@/lib/ticket-access";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
const BUCKET = "rrhh-soportes";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  if (!(await canManageTicket(access.user, ticket))) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createSupabaseStorageClient();
  if (!supabase) {
    return Response.json({ error: "Storage no disponible" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return Response.json({ error: "Formato no permitido. Usa JPG, PNG, PDF, Word o Excel." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "El archivo supera el límite de 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = `tickets/${access.user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return Response.json({ error: `No fue posible subir el archivo: ${uploadError.message}` }, { status: 500 });
  }

  const attachment = await prisma.ticketAttachment.create({
    data: { ticketId: id, url: filePath, name: file.name, size: file.size },
  });
  await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "ATTACHMENT", toValue: file.name });
  await broadcastPanelUpdate("tickets");

  return Response.json(attachment, { status: 201 });
}

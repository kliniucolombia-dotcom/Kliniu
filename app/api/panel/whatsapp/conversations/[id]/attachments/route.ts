import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sendWatiFileFromUrl } from "@/lib/wati";
import { uploadWatiAttachment } from "@/lib/wati-attachments";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const { id } = await params;
  const form = await request.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") ?? "").trim().slice(0, 1024);
  if (!(file instanceof File)) return Response.json({ error: "Falta el archivo" }, { status: 400 });

  const conversation = await prisma.watiConversation.findUnique({ where: { id }, select: { id: true, phone: true } });
  if (!conversation) return Response.json({ error: "Conversación no encontrada" }, { status: 404 });

  try {
    const uploaded = await uploadWatiAttachment(file);
    await sendWatiFileFromUrl(conversation.phone, { url: uploaded.url, fileName: uploaded.fileName, caption });
    const message = await prisma.watiMessage.create({
      data: {
        conversationId: id,
        role: "AGENT",
        senderId: access.session.userId,
        content: caption || `📎 (${uploaded.fileName})`,
        mediaType: uploaded.isImage ? "image" : "document",
        mediaUrls: [uploaded.url],
      },
    });
    await prisma.watiConversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await broadcastPanelUpdate("wati");
    return Response.json(message);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const text =
      detail === "FILE_TOO_LARGE"
        ? "El archivo supera 16 MB."
        : detail === "INVALID_FILE_TYPE"
          ? "Tipo de archivo no permitido (imagen, PDF, Office, CSV o TXT)."
          : detail.startsWith("WATI_SEND_FAILED")
            ? "WATI rechazó el archivo. Revisa la ventana de 24 horas."
            : "No fue posible enviar el archivo.";
    const clientError = detail === "FILE_TOO_LARGE" || detail === "INVALID_FILE_TYPE";
    return Response.json({ error: text }, { status: clientError ? 400 : 500 });
  }
}

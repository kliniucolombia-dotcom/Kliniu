import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { fetchWatiMedia } from "@/lib/wati";

// Sirve al panel el audio/imagen/video que mandó el cliente. WATI exige
// Authorization, así que el navegador no puede pedirlo directo.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const { id } = await params;
  const message = await prisma.watiMessage.findUnique({ where: { id }, select: { externalId: true } });
  if (!message?.externalId) return Response.json({ error: "Sin archivo" }, { status: 404 });

  const file = await fetchWatiMedia(message.externalId).catch(() => null);
  if (!file) return Response.json({ error: "Archivo no disponible" }, { status: 404 });

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

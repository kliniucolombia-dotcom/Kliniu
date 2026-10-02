import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { fetchWatiMedia } from "@/lib/wati";

// Solo tipos que el panel sabe mostrar; cualquier otro (HTML, SVG…) se sirve como descarga.
const INLINE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr", "audio/webm",
  "video/mp4", "video/3gpp", "video/webm",
]);

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

  const contentType = file.contentType.split(";")[0].trim().toLowerCase();
  const safe = INLINE_TYPES.has(contentType);

  return new Response(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": safe ? contentType : "application/octet-stream",
      "Content-Disposition": safe ? "inline" : "attachment",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "private, max-age=86400",
    },
  });
}

import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { DELIVERY_BUCKET } from "@/lib/delivery-photo";

// Foto de entrega: bucket privado, se entrega con URL firmada de corta vida.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no configurada" }, { status: 503 });

  const { id } = await params;
  const attempt = await prisma.deliveryAttempt.findUnique({ where: { id }, select: { photoPath: true } });
  if (!attempt?.photoPath) return Response.json({ error: "Sin foto" }, { status: 404 });

  const supabase = createSupabaseStorageClient();
  if (!supabase) return Response.json({ error: "Almacenamiento no configurado" }, { status: 503 });
  const { data, error } = await supabase.storage.from(DELIVERY_BUCKET).createSignedUrl(attempt.photoPath, 300);
  if (error || !data) return Response.json({ error: "No se pudo abrir la foto" }, { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}

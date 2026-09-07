import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { MATERIAL_BUCKET } from "@/lib/material";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id es obligatorio" }, { status: 400 });

  // La ruta sale de la DB, nunca del cliente: no hay traversal posible.
  const file = await prisma.materialFile.findUnique({ where: { id } });
  if (!file) return Response.json({ error: "Archivo no encontrado" }, { status: 404 });

  const supabase = createSupabaseStorageClient();
  if (!supabase) return Response.json({ error: "Storage no disponible" }, { status: 500 });

  const { data, error } = await supabase.storage.from(MATERIAL_BUCKET).createSignedUrl(file.path, 300);
  if (error || !data) return Response.json({ error: "No fue posible generar el enlace" }, { status: 500 });

  return Response.json({ url: data.signedUrl });
}

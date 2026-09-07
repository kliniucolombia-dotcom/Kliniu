import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { MATERIAL_BUCKET } from "@/lib/material";

// Vercel corta el body a 4.5 MB en las Server Actions, pero las Route Handlers
// aceptan hasta 100 MB. Dejamos 50 como tope razonable para material comercial.
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MATERIAL", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const supabase = createSupabaseStorageClient();
  if (!supabase) {
    return Response.json({ error: "Storage no configurado" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const folderIdRaw = formData.get("folderId");
  const folderId = typeof folderIdRaw === "string" && folderIdRaw ? folderIdRaw : null;

  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "El archivo supera el límite de 50 MB." }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${folderId ?? "raiz"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(MATERIAL_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `No fue posible subir el archivo: ${uploadError.message}` }, { status: 500 });
  }

  const saved = await prisma.materialFile.create({
    data: {
      folderId,
      name: file.name,
      path,
      mimeType: file.type || null,
      size: file.size,
      createdById: access.user.id,
    },
  });

  return Response.json(saved, { status: 201 });
}

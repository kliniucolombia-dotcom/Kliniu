import { requireAnyPermission } from "@/lib/permissions";
import { uploadMaintenanceFile } from "@/lib/maintenance-upload";

// Sube la foto de la prueba de acople. Solo imágenes; se guarda como webp comprimido.
export async function POST(request: Request) {
  const access = await requireAnyPermission([
    { module: "MODULE_PRODUCCION", action: "create" },
    { module: "MODULE_PRODUCCION", action: "edit" },
  ]);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar una foto." }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return Response.json({ error: "Solo se permiten fotos JPG, PNG o WebP." }, { status: 400 });
  }

  try {
    return Response.json(await uploadMaintenanceFile(file, "acople"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "La foto supera el límite de 25 MB." }, { status: 400 });
    if (message === "STORAGE_NOT_CONFIGURED") return Response.json({ error: "Storage no configurado" }, { status: 500 });
    return Response.json({ error: "No fue posible subir la foto." }, { status: 500 });
  }
}

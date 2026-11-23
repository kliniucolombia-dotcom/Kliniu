import { requireAnyPermission } from "@/lib/permissions";
import { uploadMaintenanceFile } from "@/lib/maintenance-upload";

export async function POST(request: Request) {
  const access = await requireAnyPermission([
    { module: "MODULE_CALIDAD", action: "create" },
    { module: "MODULE_CALIDAD", action: "edit" },
  ]);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
  // Solo fotos: el formulario de calidad no admite documentos.
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return Response.json({ error: "Solo se permiten fotos (JPG, PNG o WEBP)." }, { status: 400 });

  try {
    return Response.json(await uploadMaintenanceFile(file, "calidad"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "El archivo supera el límite de 25 MB." }, { status: 400 });
    if (message === "STORAGE_NOT_CONFIGURED") return Response.json({ error: "Storage no configurado" }, { status: 500 });
    return Response.json({ error: `No fue posible subir el archivo: ${message}` }, { status: 500 });
  }
}

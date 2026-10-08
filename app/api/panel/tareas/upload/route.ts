import { requirePermission } from "@/lib/permissions";
import { uploadMaintenanceFile } from "@/lib/maintenance-upload";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_TAREAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });

  try {
    return Response.json(await uploadMaintenanceFile(file, "tareas"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "El archivo supera el límite de 25 MB." }, { status: 400 });
    if (message === "INVALID_FILE_TYPE") return Response.json({ error: "Tipo de archivo no permitido. Usa imágenes, PDF, Word, Excel, PowerPoint, CSV o TXT." }, { status: 400 });
    if (message === "STORAGE_NOT_CONFIGURED") return Response.json({ error: "Storage no configurado" }, { status: 500 });
    return Response.json({ error: `No fue posible subir el archivo: ${message}` }, { status: 500 });
  }
}

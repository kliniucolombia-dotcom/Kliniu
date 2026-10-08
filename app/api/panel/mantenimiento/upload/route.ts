import { requireAnyPermission } from "@/lib/permissions";
import { uploadMaintenanceFile, type MaintenanceFolder } from "@/lib/maintenance-upload";

const FOLDERS: MaintenanceFolder[] = ["equipos", "ordenes", "inventario", "cotizaciones", "informes"];

export async function POST(request: Request) {
  const access = await requireAnyPermission([
    { module: "MODULE_MANTENIMIENTO", action: "create" },
    { module: "MODULE_MANTENIMIENTO", action: "edit" },
  ]);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = String(formData.get("folder") ?? "equipos");
  const folder: MaintenanceFolder = (FOLDERS as string[]).includes(folderRaw) ? (folderRaw as MaintenanceFolder) : "equipos";

  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });

  try {
    const result = await uploadMaintenanceFile(file, folder);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "El archivo supera el límite de 25 MB." }, { status: 400 });
    if (message === "STORAGE_NOT_CONFIGURED") return Response.json({ error: "Storage no configurado" }, { status: 500 });
    return Response.json({ error: `No fue posible subir el archivo: ${message}` }, { status: 500 });
  }
}

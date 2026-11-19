import { prisma } from "@/lib/prisma";
import { requireAnyPermission } from "@/lib/permissions";
import { uploadMaintenanceFile, type MaintenanceFolder } from "@/lib/maintenance-upload";

const FOLDERS: MaintenanceFolder[] = ["equipos", "ordenes", "inventario", "cotizaciones", "informes"];

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const folderRaw = String(formData.get("folder") ?? "equipos");
  const folder: MaintenanceFolder = (FOLDERS as string[]).includes(folderRaw) ? (folderRaw as MaintenanceFolder) : "equipos";

  const full = await requireAnyPermission([
    { module: "MODULE_MANTENIMIENTO", action: "create" },
    { module: "MODULE_MANTENIMIENTO", action: "edit" },
  ]);
  let access = full;
  if (!full.ok) {
    // Técnico con solo "ver" (ej. OPERARIO): puede adjuntar imágenes a la carpeta de órdenes
    // únicamente si tiene alguna orden activa asignada. El PATCH de la orden valida que sea suya.
    const viewer = folder === "ordenes" ? await requireAnyPermission([{ module: "MODULE_MANTENIMIENTO", action: "view" }]) : full;
    const hasOrder = viewer.ok && (await prisma?.maintenanceOrder.findFirst({ where: { assignedToId: viewer.user.id, status: { not: "DONE" } }, select: { id: true } }));
    const isImage = file instanceof File && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!viewer.ok || !hasOrder || !isImage) return Response.json({ error: "No autorizado" }, { status: viewer.ok ? 403 : viewer.status });
    access = viewer;
  }
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });

  try {
    const result = await uploadMaintenanceFile(file, folder);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "El archivo supera el límite de 25 MB." }, { status: 400 });
    if (message === "INVALID_FILE_TYPE") return Response.json({ error: "Tipo de archivo no permitido. Usa imágenes, PDF, Word, Excel, PowerPoint, CSV o TXT." }, { status: 400 });
    if (message === "STORAGE_NOT_CONFIGURED") return Response.json({ error: "Storage no configurado" }, { status: 500 });
    return Response.json({ error: `No fue posible subir el archivo: ${message}` }, { status: 500 });
  }
}

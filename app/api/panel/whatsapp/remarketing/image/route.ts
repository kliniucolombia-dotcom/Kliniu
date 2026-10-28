import { requirePermission } from "@/lib/permissions";
import { uploadWatiAttachment } from "@/lib/wati-attachments";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return Response.json({ error: "Sube una imagen JPG o PNG." }, { status: 400 });
  }

  try {
    const uploaded = await uploadWatiAttachment(file);
    return Response.json({ url: uploaded.url });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const text =
      detail === "FILE_TOO_LARGE"
        ? "La imagen es demasiado pesada."
        : detail === "INVALID_FILE_TYPE"
          ? "Formato no admitido. Usa JPG o PNG."
          : "No fue posible subir la imagen.";
    return Response.json({ error: text }, { status: 400 });
  }
}

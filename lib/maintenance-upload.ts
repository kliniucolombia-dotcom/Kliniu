import sharp from "sharp";
import { createSupabaseStorageClient, getStorageBucket } from "@/lib/supabase-storage";

export type MaintenanceAttachment = { url: string; name: string; isImage: boolean };

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Documentos permitidos (además de imágenes). La extensión y el content-type salen de aquí, no del cliente.
const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/csv": "csv",
  "text/plain": "txt",
};
const FOLDERS = ["equipos", "ordenes", "inventario", "cotizaciones", "informes", "tareas"] as const;
export type MaintenanceFolder = (typeof FOLDERS)[number];

// Sube una foto (comprimida a webp) o un documento y devuelve su URL pública.
export async function uploadMaintenanceFile(file: File, folder: MaintenanceFolder) {
  if (!FOLDERS.includes(folder)) throw new Error("INVALID_FOLDER");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("FILE_TOO_LARGE");

  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isImage && !DOC_TYPES[file.type]) throw new Error("INVALID_FILE_TYPE");

  const supabase = createSupabaseStorageClient();
  if (!supabase) throw new Error("STORAGE_NOT_CONFIGURED");

  const id = `${Date.now()}-${crypto.randomUUID()}`;

  let body: Buffer;
  let contentType: string;
  let ext: string;
  if (isImage) {
    body = await sharp(Buffer.from(await file.arrayBuffer()))
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    contentType = "image/webp";
    ext = "webp";
  } else {
    body = Buffer.from(await file.arrayBuffer());
    contentType = file.type;
    ext = DOC_TYPES[file.type];
  }

  const path = `mantenimiento/${folder}/${id}.${ext}`;
  const { error } = await supabase.storage.from(getStorageBucket()).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(getStorageBucket()).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, mimeType: contentType, isImage };
}

/** Solo URLs http(s); cualquier otra cosa (javascript:, data:) se descarta. */
export function safeUrl(value: unknown): string | null {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
}

// Sanea la lista de adjuntos que llega desde el cliente: solo URLs http(s), tope 20.
export function normalizeAttachments(value: unknown): MaintenanceAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as { url?: unknown; name?: unknown; isImage?: unknown };
      if (typeof item.url !== "string" || !/^https?:\/\//.test(item.url)) return [];
      return [{
        url: item.url,
        name: typeof item.name === "string" && item.name.trim() ? item.name.trim().slice(0, 160) : "Adjunto",
        isImage: item.isImage === true,
      }];
    });
}

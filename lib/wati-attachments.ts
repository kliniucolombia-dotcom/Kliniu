import sharp from "sharp";
import { createSupabaseStorageClient, getStorageBucket } from "@/lib/supabase-storage";

const MAX_BYTES = 16 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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

/** Sube el adjunto a Storage. Las imágenes salen en JPEG porque WATI rechaza webp/avif. */
export async function uploadWatiAttachment(file: File) {
  if (file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const isImage = IMAGE_TYPES.has(file.type);
  if (!isImage && !Object.hasOwn(DOC_TYPES, file.type)) throw new Error("INVALID_FILE_TYPE");

  const supabase = createSupabaseStorageClient();
  if (!supabase) throw new Error("STORAGE_NOT_CONFIGURED");

  const raw = Buffer.from(await file.arrayBuffer());
  const body = isImage
    ? await sharp(raw).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
    : raw;
  const contentType = isImage ? "image/jpeg" : file.type;
  const ext = isImage ? "jpg" : DOC_TYPES[file.type];
  const path = `whatsapp/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(getStorageBucket()).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(getStorageBucket()).getPublicUrl(path);
  return { url: data.publicUrl, fileName: isImage ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name, isImage };
}

import sharp from "sharp";
import { createSupabaseStorageClient, getStorageBucket } from "@/lib/supabase-storage";

export type MaintenanceAttachment = { url: string; name: string; isImage: boolean };

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Documentos permitidos (además de imágenes). La extensión y el content-type salen de aquí, no del cliente.
export const DOC_TYPES: Record<string, string> = {
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
const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  zip: [0x50, 0x4b], // docx/xlsx/pptx
  ole: [0xd0, 0xcf, 0x11, 0xe0], // doc/xls/ppt
};
export function matchesMagic(type: string, head: Buffer) {
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  const ext = DOC_TYPES[type];
  if (ext === "pdf") return starts(MAGIC.pdf);
  if (ext === "docx" || ext === "xlsx" || ext === "pptx") return starts(MAGIC.zip);
  if (ext === "doc" || ext === "xls" || ext === "ppt") return starts(MAGIC.ole);
  return !head.includes(0); // csv/txt: texto plano, sin bytes nulos
}
const FOLDERS = ["equipos", "ordenes", "inventario", "cotizaciones", "informes", "tareas", "acople", "calidad"] as const;
export type MaintenanceFolder = (typeof FOLDERS)[number];

// Sube una foto (comprimida a webp) o un documento y devuelve su URL pública.
export async function uploadMaintenanceFile(file: File, folder: MaintenanceFolder) {
  if (!FOLDERS.includes(folder)) throw new Error("INVALID_FOLDER");
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("FILE_TOO_LARGE");

  const isImage = IMAGE_TYPES.includes(file.type);
  if (!isImage && !Object.hasOwn(DOC_TYPES, file.type)) throw new Error("INVALID_FILE_TYPE");
  // El content-type lo declara el cliente: se comprueba contra los primeros bytes del archivo.
  if (!isImage && !matchesMagic(file.type, Buffer.from(await file.slice(0, 8).arrayBuffer()))) throw new Error("INVALID_FILE_TYPE");

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

// Videos (solo control de calidad): el navegador sube directo a Storage con URL firmada,
// porque Vercel corta los cuerpos de más de 4,5 MB. 50 MB = máximo por archivo del plan de Supabase.
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
const VIDEO_DIR = "mantenimiento/calidad/videos";

export async function startVideoUpload(mimeType: unknown, size: unknown) {
  if (typeof mimeType !== "string" || !Object.hasOwn(VIDEO_TYPES, mimeType)) throw new Error("INVALID_FILE_TYPE");
  if (typeof size !== "number" || size <= 0 || size > VIDEO_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const supabase = createSupabaseStorageClient();
  if (!supabase) throw new Error("STORAGE_NOT_CONFIGURED");
  const path = `${VIDEO_DIR}/${Date.now()}-${crypto.randomUUID()}.${VIDEO_TYPES[mimeType]}`;
  const { data, error } = await supabase.storage.from(getStorageBucket()).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "UPLOAD_URL_FAILED");
  return { path, signedUrl: data.signedUrl };
}

/** Revisa el video ya subido (tamaño, tipo y primeros bytes reales); si no pasa, lo borra. */
export async function finishVideoUpload(path: unknown, name: unknown) {
  if (typeof path !== "string" || !path.startsWith(`${VIDEO_DIR}/`) || path.includes("..")) throw new Error("INVALID_PATH");
  const supabase = createSupabaseStorageClient();
  if (!supabase) throw new Error("STORAGE_NOT_CONFIGURED");
  const bucket = supabase.storage.from(getStorageBucket());
  const file = path.slice(VIDEO_DIR.length + 1);
  const { data: list } = await bucket.list(VIDEO_DIR, { search: file, limit: 1 });
  const meta = list?.find((o) => o.name === file)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta) throw new Error("NOT_UPLOADED");
  const { data } = bucket.getPublicUrl(path);
  const head = Buffer.from(await (await fetch(data.publicUrl, { headers: { Range: "bytes=0-15" } })).arrayBuffer());
  const mimeType = String(meta.mimetype ?? "");
  const magic = mimeType === "video/webm"
    ? head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3
    : head.subarray(4, 8).toString() === "ftyp"; // mp4 / mov
  const size = Number(meta.size ?? 0);
  if (!(size > 0 && size <= VIDEO_MAX_BYTES && VIDEO_TYPES[mimeType] && path.endsWith(`.${VIDEO_TYPES[mimeType]}`) && magic)) {
    await bucket.remove([path]);
    throw new Error("INVALID_FILE_TYPE");
  }
  return { url: data.publicUrl, name: typeof name === "string" && name.trim() ? name.trim().slice(0, 160) : "Video", isImage: false };
}

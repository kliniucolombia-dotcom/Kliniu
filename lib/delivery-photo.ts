import sharp from "sharp";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";

// Bucket PRIVADO: las fotos pueden mostrar casas o personas. Se leen con URL firmada.
export const DELIVERY_BUCKET = "logistica-entregas";
const MAX_BYTES = 8 * 1024 * 1024;

/** Sube la foto de entrega (webp, 1280 px, sin EXIF) y devuelve su ruta en el bucket. */
export async function uploadDeliveryPhoto(file: File, routeId: string, orderId: string) {
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
  const supabase = createSupabaseStorageClient();
  if (!supabase) throw new Error("STORAGE_NOT_CONFIGURED");

  // sharp rechaza lo que no sea imagen real, así no se confía en el content-type del cliente.
  let body: Buffer;
  try {
    body = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new Error("INVALID_FILE_TYPE");
  }

  const path = `${routeId}/${orderId}-${Date.now()}.webp`;
  const { error } = await supabase.storage.from(DELIVERY_BUCKET).upload(path, body, { contentType: "image/webp", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

/** Foto de entrega como data URL (para incrustarla en el comprobante PDF sin exponer una URL del bucket). */
export async function deliveryPhotoDataUrl(path: string) {
  const supabase = createSupabaseStorageClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(DELIVERY_BUCKET).download(path);
  if (error || !data) return null;
  return `data:image/webp;base64,${Buffer.from(await data.arrayBuffer()).toString("base64")}`;
}

export async function deleteDeliveryPhoto(path: string) {
  await createSupabaseStorageClient()?.storage.from(DELIVERY_BUCKET).remove([path]).catch(() => {});
}

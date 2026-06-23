import sharp from "sharp";
import { getStorageBucket, createSupabaseStorageClient } from "@/lib/supabase-storage";
import { slugify } from "@/app/data/catalog";
import { requireAdminOrSeller } from "@/lib/admin";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB antes de comprimir
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export async function POST(request: Request) {
  try {
    await requireAdminOrSeller();
    const supabase = createSupabaseStorageClient();

    if (!supabase) {
      return Response.json(
        {
          error:
            "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar Storage.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const productName = String(formData.get("productName") || "producto");

    if (!(file instanceof File)) {
      return Response.json({ error: "Debes seleccionar una imagen." }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return Response.json(
        { error: "La imagen debe estar en formato JPG, PNG o WEBP." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: "La imagen supera el límite de 20 MB." },
        { status: 400 },
      );
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressImage(rawBuffer);

    const bucket = getStorageBucket();
    const filePath = `products/${Date.now()}-${slugify(productName)}.webp`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressed, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      return Response.json(
        { error: `No fue posible subir la imagen: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return Response.json({
      path: filePath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? "No autorizado."
        : error instanceof Error ? error.message : "No fue posible subir la imagen.";

    const status =
      error instanceof Error &&
      (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ? 401
        : 500;

    return Response.json({ error: message }, { status });
  }
}

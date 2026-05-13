import { getStorageBucket, createSupabaseStorageClient } from "@/lib/supabase-storage";
import { slugify } from "@/app/data/catalog";
import { requireAdminUser } from "@/lib/admin";

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getFileExtension(fileName: string) {
  const cleanName = fileName.toLowerCase();
  const parts = cleanName.split(".");
  return parts.length > 1 ? parts.at(-1) || "jpg" : "jpg";
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
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
        { error: "La imagen supera el límite de 3 MB." },
        { status: 400 },
      );
    }

    const bucket = getStorageBucket();
    const extension = getFileExtension(file.name);
    const filePath = `products/${Date.now()}-${slugify(productName)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type || "application/octet-stream",
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

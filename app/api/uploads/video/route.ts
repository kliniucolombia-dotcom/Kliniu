import { getStorageBucket, createSupabaseStorageClient } from "@/lib/supabase-storage";
import { slugify } from "@/app/data/catalog";
import { requirePermission } from "@/lib/permissions";

const MAX_FILE_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: Request) {
  try {
    const access = await requirePermission("MODULE_BANNERS", "edit");
    if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

    const supabase = createSupabaseStorageClient();
    if (!supabase) {
      return Response.json(
        { error: "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar Storage." },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const label = String(formData.get("label") || "video");

    if (!(file instanceof File)) {
      return Response.json({ error: "Debes seleccionar un video." }, { status: 400 });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return Response.json({ error: "El video debe estar en formato MP4, WEBM o MOV." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: "El video supera el límite de 60 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = EXT_BY_TYPE[file.type];
    const bucket = getStorageBucket();
    const filePath = `solutions/${Date.now()}-${slugify(label)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return Response.json({ error: `No fue posible subir el video: ${uploadError.message}` }, { status: 500 });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return Response.json({ path: filePath, publicUrl: data.publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible subir el video.";
    return Response.json({ error: message }, { status: 500 });
  }
}

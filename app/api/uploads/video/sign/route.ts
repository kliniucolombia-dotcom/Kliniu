import { getStorageBucket, createSupabaseStorageClient } from "@/lib/supabase-storage";
import { slugify } from "@/app/data/catalog";
import { requirePermission } from "@/lib/permissions";

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const TYPE_BY_EXT: Record<string, string> = {
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};
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

    const { label, contentType, fileName, size } = (await request.json()) as {
      label?: string;
      contentType?: string;
      fileName?: string;
      size?: number;
    };

    const extFromName = fileName?.split(".").pop()?.toLowerCase() ?? "";
    const resolvedType =
      contentType && ALLOWED_VIDEO_TYPES.includes(contentType)
        ? contentType
        : TYPE_BY_EXT[extFromName] ?? "";

    if (!resolvedType) {
      return Response.json({ error: "El video debe estar en formato MP4, WEBM o MOV." }, { status: 400 });
    }

    if (typeof size === "number" && size > MAX_FILE_SIZE_BYTES) {
      return Response.json({ error: "El video supera el límite de 500 MB." }, { status: 400 });
    }

    const ext = EXT_BY_TYPE[resolvedType];
    const bucket = getStorageBucket();
    const filePath = `solutions/${Date.now()}-${slugify(label || "video")}.${ext}`;

    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(filePath);
    if (error || !data) {
      return Response.json(
        { error: `No fue posible preparar la subida: ${error?.message ?? "error desconocido"}` },
        { status: 500 },
      );
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return Response.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      contentType: resolvedType,
      publicUrl: publicData.publicUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible preparar la subida.";
    return Response.json({ error: message }, { status: 500 });
  }
}

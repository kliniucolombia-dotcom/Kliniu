import sharp from "sharp";
import { getStorageBucket, createSupabaseStorageClient } from "@/lib/supabase-storage";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const supabase = createSupabaseStorageClient();
  if (!supabase) {
    return Response.json(
      { error: "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar Storage." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar una imagen." }, { status: 400 });
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return Response.json({ error: "La imagen debe estar en formato JPG, PNG o WEBP." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "La imagen supera el límite de 10 MB." }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(rawBuffer)
    .resize(400, 400, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();

  const bucket = getStorageBucket();
  const filePath = `avatars/${access.user.id}-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, compressed, {
    contentType: "image/webp",
    upsert: false,
  });
  if (uploadError) return Response.json({ error: `No fue posible subir la imagen: ${uploadError.message}` }, { status: 500 });

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  await prisma.user.update({ where: { id: access.user.id }, data: { avatarUrl: data.publicUrl } });

  return Response.json({ avatarUrl: data.publicUrl });
}

import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const BUCKET = "rrhh-soportes";

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const supabase = createSupabaseStorageClient();
  const url = new URL(request.url);
  const forUserId = url.searchParams.get("forUserId");
  const ownerId = forUserId && isRRHH(access.user) ? forUserId : access.user.id;
  if (!supabase) {
    return Response.json(
      { error: "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para usar Storage." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return Response.json({ error: "El soporte debe ser JPG, PNG, WEBP o PDF." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "El archivo supera el límite de 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const filePath = `${ownerId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return Response.json({ error: `No fue posible subir el soporte: ${uploadError.message}` }, { status: 500 });
  }

  return Response.json({ path: filePath, name: file.name });
}

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return Response.json({ error: "path es obligatorio" }, { status: 400 });

  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee || !path.startsWith(`${access.user.id}/`)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const supabase = createSupabaseStorageClient();
  if (!supabase) return Response.json({ error: "Storage no disponible" }, { status: 500 });

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) return Response.json({ error: "No fue posible generar el enlace" }, { status: 500 });

  return Response.json({ url: data.signedUrl });
}

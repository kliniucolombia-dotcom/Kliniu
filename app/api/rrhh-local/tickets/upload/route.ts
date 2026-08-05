import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { requireActiveUser } from "@/lib/permissions";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/webp", "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const BUCKET = "rrhh-soportes";

export async function POST(request: Request) {
  const access = await requireActiveUser();
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
  if (!(file instanceof File)) return Response.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return Response.json({ error: "Formato no permitido. Usa JPG, PNG, PDF, Word o Excel." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return Response.json({ error: "El archivo supera el límite de 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const filePath = `tickets/${access.user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return Response.json({ error: `No fue posible subir el archivo: ${uploadError.message}` }, { status: 500 });
  }

  return Response.json({ path: filePath, name: file.name, size: file.size });
}

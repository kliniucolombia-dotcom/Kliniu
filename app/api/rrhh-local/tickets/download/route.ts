import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";

const BUCKET = "rrhh-soportes";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return Response.json({ error: "path es obligatorio" }, { status: 400 });
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    return Response.json({ error: "Ruta inválida" }, { status: 400 });
  }

  if (!isRRHH(access.user) && !path.startsWith(`tickets/${access.user.id}/`)) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createSupabaseStorageClient();
  if (!supabase) return Response.json({ error: "Storage no disponible" }, { status: 500 });

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) return Response.json({ error: "No fue posible generar el enlace" }, { status: 500 });

  return Response.json({ url: data.signedUrl });
}

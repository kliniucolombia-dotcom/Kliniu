import { requireAnyPermission } from "@/lib/permissions";
import { finishVideoUpload, startVideoUpload } from "@/lib/maintenance-upload";

/** { action: "start", mimeType, size } → URL firmada; { action: "finish", path, name } → adjunto verificado. */
export async function POST(request: Request) {
  const access = await requireAnyPermission([
    { module: "MODULE_CONTROL_CALIDAD", action: "create" },
    { module: "MODULE_CONTROL_CALIDAD", action: "edit" },
  ]);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { action?: string; mimeType?: unknown; size?: unknown; path?: unknown; name?: unknown };
  try {
    if (body.action === "start") return Response.json(await startVideoUpload(body.mimeType, body.size));
    if (body.action === "finish") return Response.json(await finishVideoUpload(body.path, body.name));
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FILE_TOO_LARGE") return Response.json({ error: "El video supera 50 MB. Grábalo más corto o en 720p." }, { status: 400 });
    if (message === "INVALID_FILE_TYPE") return Response.json({ error: "El video debe ser MP4, MOV o WEBM." }, { status: 400 });
    if (message === "NOT_UPLOADED") return Response.json({ error: "El video no terminó de subir. Intenta de nuevo." }, { status: 400 });
    return Response.json({ error: `No fue posible subir el video: ${message}` }, { status: 500 });
  }
}

import { requirePermission } from "@/lib/permissions";
import { getWatiTemplates } from "@/lib/wati";

export async function GET() {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    return Response.json(await getWatiTemplates());
  } catch {
    return Response.json({ error: "No fue posible consultar las plantillas de WATI." }, { status: 502 });
  }
}

import { getCajas, setCajas } from "@/lib/empaque-cajas";
import { requirePermission } from "@/lib/permissions";

export async function GET() {
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  return Response.json(await getCajas());
}

/** Reemplaza la lista completa de cajas. */
export async function PUT(request: Request) {
  const access = await requirePermission("MODULE_PEDIDOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const cajas = await setCajas(await request.json().catch(() => null));
  if (!cajas) return Response.json({ error: "Revisa nombre y medidas de cada caja" }, { status: 400 });
  return Response.json(cajas);
}

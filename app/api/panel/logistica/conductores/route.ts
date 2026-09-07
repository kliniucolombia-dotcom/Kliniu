import { requirePermission } from "@/lib/permissions";
import { createDriver } from "@/lib/logistics";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { fullName?: string; phone?: string };
  if (!body.fullName?.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const driver = await createDriver({ fullName: body.fullName.trim(), phone: body.phone?.trim() || undefined });
  return Response.json({ driver });
}

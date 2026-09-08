import { requirePermission, getEffectivePermission } from "@/lib/permissions";
import { createMold, getMoldKpis, listMoldChanges, listMolds } from "@/lib/molds";
import { getMachines } from "@/lib/panel";
import { parseDateRange } from "@/lib/operations-validation";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  try { parseDateRange(from, to); } catch {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const [molds, machines, changes, kpis, permission] = await Promise.all([
    listMolds(),
    getMachines(false),
    listMoldChanges(from, to),
    getMoldKpis(from, to),
    getEffectivePermission(access.user, "MODULE_PRODUCCION"),
  ]);

  return Response.json({ molds, machines, changes, kpis, permission });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { code?: string; name?: string };
  if (!body.code?.trim() || !body.name?.trim()) {
    return Response.json({ error: "Faltan datos (code, name)" }, { status: 400 });
  }

  try {
    const mold = await createMold({ code: body.code, name: body.name });
    return Response.json({ mold });
  } catch (error) {
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un molde con ese código" : "No fue posible crear el molde" }, { status: 400 });
  }
}

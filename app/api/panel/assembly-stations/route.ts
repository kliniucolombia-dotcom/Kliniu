import { requirePermission } from "@/lib/permissions";
import { createAssemblyStation, getAssemblyStations } from "@/lib/assembly";
import { assemblyErrorResponse } from "@/lib/assembly-errors";
import { isRecord, parsePositiveInteger, parseRequiredString } from "@/lib/operations-validation";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const onlyActive = new URL(request.url).searchParams.get("active") === "1";
  return Response.json({ stations: await getAssemblyStations(onlyActive) });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return Response.json({ error: "Cuerpo inválido" }, { status: 400 });

  try {
    const station = await createAssemblyStation({
      code: parsePositiveInteger(body.code),
      name: parseRequiredString(body.name),
      location: typeof body.location === "string" ? body.location : null,
    });
    return Response.json(station, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return Response.json({ error: "Ya existe un puesto con ese código" }, { status: 409 });
    }
    return assemblyErrorResponse(e);
  }
}

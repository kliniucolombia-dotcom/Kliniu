import { getSessionFromCookies } from "@/lib/auth";
import { createMachine, getMachines } from "@/lib/panel";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const includeInactive = new URL(request.url).searchParams.get("includeInactive") === "true";
  const machines = await getMachines(includeInactive);
  return Response.json({ machines });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    code?: number; name?: string; brand?: string; model?: string; location?: string;
  };
  if (!body.code || !body.name?.trim() || !body.brand?.trim()) {
    return Response.json({ error: "code, name y brand son requeridos" }, { status: 400 });
  }

  try {
    const created = await createMachine({ code: body.code, name: body.name, brand: body.brand, model: body.model, location: body.location });
    return Response.json(created);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

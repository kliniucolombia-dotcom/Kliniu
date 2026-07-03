import { getSessionFromCookies } from "@/lib/auth";
import { deleteMachine, updateMachine } from "@/lib/panel";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json() as {
    code?: number; name?: string; brand?: string; model?: string | null; location?: string | null; isActive?: boolean;
  };

  try {
    const updated = await updateMachine(id, body);
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await deleteMachine(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

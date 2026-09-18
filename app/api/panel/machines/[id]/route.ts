import { requireAdmin } from "@/lib/permissions";
import { deleteMachine, updateMachine } from "@/lib/panel";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const body = await request.json() as {
    code?: number; name?: string; brand?: string; model?: string | null; location?: string | null; isActive?: boolean;
  };

  try {
    const updated = await updateMachine(id, body);
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    await deleteMachine(id);
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

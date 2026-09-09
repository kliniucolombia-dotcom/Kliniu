import { requirePermission } from "@/lib/permissions";
import { deleteCustomer } from "@/lib/logistics";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  try {
    await deleteCustomer(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Este cliente viene de pedidos y no se puede eliminar aquí" }, { status: 400 });
  }
}

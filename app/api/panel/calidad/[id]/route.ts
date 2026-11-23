import { requirePermission } from "@/lib/permissions";
import { assertQuantities, deleteCase, getCase, parseCaseInput, QUALITY_ERRORS, updateCase } from "@/lib/quality";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CALIDAD", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const current = await getCase(id);
  if (!current) return Response.json({ error: "Caso no encontrado" }, { status: 404 });
  try {
    const data = parseCaseInput(await request.json().catch(() => null), true);
    assertQuantities((data.dispatchedQty as number) ?? current.dispatchedQty, (data.defectiveQty as number) ?? current.defectiveQty);
    return Response.json({ case: await updateCase(id, data) });
  } catch (e) {
    const msg = e instanceof Error ? QUALITY_ERRORS[e.message] : undefined;
    if (msg) return Response.json({ error: msg }, { status: 400 });
    throw e;
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CALIDAD", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  if (!(await getCase(id))) return Response.json({ error: "Caso no encontrado" }, { status: 404 });
  await deleteCase(id);
  return Response.json({ ok: true });
}

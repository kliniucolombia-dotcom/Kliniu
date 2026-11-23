import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { assertQuantities, createCase, listCases, parseCaseInput, QUALITY_ERRORS } from "@/lib/quality";

export async function GET() {
  const access = await requirePermission("MODULE_CALIDAD", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  return Response.json({ cases: await listCases(), permission: await getEffectivePermission(access.user, "MODULE_CALIDAD") });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CALIDAD", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  try {
    const data = parseCaseInput(await request.json().catch(() => null));
    assertQuantities(data.dispatchedQty as number, data.defectiveQty as number);
    return Response.json({ case: await createCase(data, access.user.id) });
  } catch (e) {
    const msg = e instanceof Error ? QUALITY_ERRORS[e.message] : undefined;
    if (msg) return Response.json({ error: msg }, { status: 400 });
    throw e;
  }
}

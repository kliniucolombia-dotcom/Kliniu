import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { createInspection, INSPECTION_ERRORS, listInspections, parseInspectionInput, QUALITY_SIGNER_EMAIL } from "@/lib/quality-inspection";

export async function GET() {
  const access = await requirePermission("MODULE_CONTROL_CALIDAD", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  return Response.json({
    inspections: await listInspections(),
    permission: await getEffectivePermission(access.user, "MODULE_CONTROL_CALIDAD"),
    canSign: access.user.email === QUALITY_SIGNER_EMAIL,
  });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CONTROL_CALIDAD", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  try {
    const data = parseInspectionInput(await request.json().catch(() => null));
    return Response.json({ inspection: await createInspection(data, access.user.id) });
  } catch (e) {
    const msg = e instanceof Error ? INSPECTION_ERRORS[e.message] : undefined;
    if (msg) return Response.json({ error: msg }, { status: 400 });
    throw e;
  }
}

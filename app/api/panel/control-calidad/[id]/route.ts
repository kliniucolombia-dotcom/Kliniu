import { requirePermission } from "@/lib/permissions";
import {
  deleteInspection, getInspection, INSPECTION_ERRORS, parseInspectionInput, QUALITY_SIGNER_EMAIL, signInspection, updateInspection,
} from "@/lib/quality-inspection";

type Ctx = { params: Promise<{ id: string }> };

const fail = (code: string, status = 400) => Response.json({ error: INSPECTION_ERRORS[code] }, { status });

/** body = { action: "sign", signatureData } para firmar; si no, edición de los campos. */
export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json().catch(() => null);
  const signing = body?.action === "sign";
  const access = await requirePermission("MODULE_CONTROL_CALIDAD", signing ? "view" : "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const current = await getInspection(id);
  if (!current) return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  if (current.signedAt) return fail("ALREADY_SIGNED", 409);
  try {
    if (signing) {
      if (access.user.email !== QUALITY_SIGNER_EMAIL) return fail("NOT_SIGNER", 403);
      return Response.json({ inspection: await signInspection(id, access.user.id, body.signatureData, body.updatedAt) });
    }
    return Response.json({ inspection: await updateInspection(id, parseInspectionInput(body)) });
  } catch (e) {
    // P2025: otro usuario editó o firmó entre la lectura y la escritura.
    if ((e as { code?: string })?.code === "P2025") return fail("STALE", 409);
    const msg = e instanceof Error ? INSPECTION_ERRORS[e.message] : undefined;
    if (msg) return Response.json({ error: msg }, { status: 400 });
    throw e;
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_CALIDAD", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const current = await getInspection(id);
  if (!current) return Response.json({ error: "Registro no encontrado" }, { status: 404 });
  if (current.signedAt) return fail("ALREADY_SIGNED", 409);
  await deleteInspection(id);
  return Response.json({ ok: true });
}

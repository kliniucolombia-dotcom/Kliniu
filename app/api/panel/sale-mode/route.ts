import { requireSuperAdmin } from "@/lib/admin";
import { getSaleMode, setSaleMode, type SaleMode } from "@/lib/sale-mode";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch (err) {
    const status = err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 403;
    return Response.json({ error: "FORBIDDEN" }, { status });
  }

  const mode = await getSaleMode();
  return Response.json({ mode });
}

export async function POST(req: Request) {
  let actor: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    actor = await requireSuperAdmin();
  } catch (err) {
    const status = err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 403;
    return Response.json({ error: "FORBIDDEN" }, { status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const mode = (body as { mode?: unknown })?.mode;
  if (mode !== "cart" && mode !== "whatsapp") {
    return Response.json({ error: "INVALID_MODE" }, { status: 400 });
  }

  await setSaleMode(mode as SaleMode);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "appconfig.sale_mode",
    entity: "appConfig",
    entityId: "sale_mode",
    meta: { mode },
    ip: getClientIp(req),
  });
  return Response.json({ mode });
}

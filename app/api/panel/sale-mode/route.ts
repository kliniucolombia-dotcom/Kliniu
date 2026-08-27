import { requireSuperAdmin } from "@/lib/admin";
import { getSaleMode, setSaleMode, type SaleMode } from "@/lib/sale-mode";

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
  try {
    await requireSuperAdmin();
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
  return Response.json({ mode });
}

import { requireSuperAdmin } from "@/lib/admin";
import { getCountryWhatsapp, setCountryWhatsapp, WHATSAPP_COUNTRIES, type CountryWhatsapp } from "@/lib/country-whatsapp";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  let actor: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    actor = await requireSuperAdmin();
  } catch (err) {
    const status = err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 403;
    return Response.json({ error: "FORBIDDEN" }, { status });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const value = {} as CountryWhatsapp;
  for (const { code } of WHATSAPP_COUNTRIES) {
    const raw = typeof body?.[code] === "string" ? (body[code] as string).replace(/\D/g, "") : "";
    if (raw && raw.length !== 8) {
      return Response.json({ error: "INVALID_PHONE", country: code }, { status: 400 });
    }
    value[code] = raw;
  }

  const from = await getCountryWhatsapp();
  await setCountryWhatsapp(value);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "appconfig.whatsapp_por_pais",
    entity: "appConfig",
    entityId: "whatsapp_por_pais",
    meta: { from, to: value },
    ip: getClientIp(req),
  });
  return Response.json(value);
}

import { requirePermission } from "@/lib/permissions";
import {
  getRemarketingConfig,
  getRemarketingMetrics,
  saveRemarketingConfig,
  type RemarketingConfig,
} from "@/lib/wati-followup";
import { getProducts } from "@/lib/products";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const days = Math.min(365, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 30));
  const [config, metrics, products] = await Promise.all([
    getRemarketingConfig(),
    getRemarketingMetrics(days),
    getProducts(),
  ]);
  return Response.json({
    config,
    metrics,
    products: products.map((p) => ({ slug: p.slug, name: p.nombre, category: p.categoria })),
  });
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function validate(body: unknown): RemarketingConfig | null {
  const c = body as RemarketingConfig;
  if (!c || typeof c !== "object") return null;
  const dateOk = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const ok =
    typeof c.enabled === "boolean" &&
    Array.isArray(c.delaysMin) &&
    c.delaysMin.length === 5 &&
    c.delaysMin.every((d, i) => Number.isInteger(d) && d > 0 && d < 24 * 60 && (i === 0 || d > c.delaysMin[i - 1])) &&
    Array.isArray(c.days) &&
    c.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    Number.isInteger(c.cooldownDays) &&
    c.cooldownDays >= 0 &&
    Array.isArray(c.promotions) &&
    c.promotions.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.title === "string" && p.title.trim() !== "" &&
        typeof p.description === "string" &&
        isStringArray(p.productSlugs) &&
        isStringArray(p.categories) &&
        dateOk(p.startsAt) && dateOk(p.endsAt) && p.startsAt <= p.endsAt &&
        typeof p.gift === "boolean" &&
        typeof p.shippingIncluded === "boolean",
    ) &&
    typeof c.alternatives === "object" && c.alternatives !== null &&
    Object.values(c.alternatives).every((v) => isStringArray(v) && v.length <= 2) &&
    typeof c.volumeRules === "object" && c.volumeRules !== null &&
    Object.values(c.volumeRules).every((v) => typeof v === "string") &&
    typeof c.shippingIncludedRule === "string" &&
    typeof c.cashOnDelivery === "boolean" &&
    Array.isArray(c.templates) &&
    c.templates.every(
      (t) =>
        typeof t.id === "string" &&
        typeof t.name === "string" && t.name.trim() !== "" &&
        typeof t.text === "string" && t.text.trim() !== "" &&
        // WhatsApp corta el pie de foto en 1024 caracteres.
        t.text.length <= (t.imageUrl ? 1024 : 4096) &&
        (t.imageUrl === null || (typeof t.imageUrl === "string" && t.imageUrl.startsWith("https://"))) &&
        Array.isArray(t.stages) && t.stages.length > 0 &&
        t.stages.every((st) => Number.isInteger(st) && st >= 1 && st <= 5) &&
        isStringArray(t.productSlugs) &&
        isStringArray(t.categories) &&
        typeof t.active === "boolean" &&
        typeof t.updatedAt === "string",
    );
  return ok ? c : null;
}

export async function PUT(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const config = validate(await request.json().catch(() => null));
  if (!config) return Response.json({ error: "Configuración inválida." }, { status: 400 });
  const before = await getRemarketingConfig();
  await saveRemarketingConfig(config);
  // Solo se anotan los apartados que cambiaron; el contenido va en la tabla AppConfig.
  const changedKeys = (Object.keys(config) as (keyof RemarketingConfig)[]).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(config[k]),
  );
  await logAudit({
    actorId: access.user.id,
    actorEmail: access.user.email,
    action: "appconfig.wati_remarketing",
    entity: "appConfig",
    entityId: "wati_remarketing",
    meta: { changedKeys },
    ip: getClientIp(request),
  });
  return Response.json({ ok: true });
}

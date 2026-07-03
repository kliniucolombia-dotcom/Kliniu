import { requireAdminUser } from "@/lib/admin";
import { getValidToken } from "@/lib/kommo";
import { kommoFetch } from "@/lib/kommo/client";
import { getKommoConfig } from "@/lib/kommo/mappers/config";
import { mapUserToContact } from "@/lib/kommo/mappers/contact.mapper";
import { mapOrderToLead, orderTag } from "@/lib/kommo/mappers/lead.mapper";
import { mapOrderToNote } from "@/lib/kommo/mappers/note.mapper";

interface CheckResult {
  ok: boolean;
  ms: number;
  data?: unknown;
  error?: string;
}

async function check(label: string, fn: () => Promise<unknown>): Promise<[string, CheckResult]> {
  const start = Date.now();
  try {
    const data = await fn();
    const ms = Date.now() - start;
    console.log(`[kommo:test] ✓ ${label} (${ms}ms)`);
    return [label, { ok: true, ms, data }];
  } catch (err) {
    const ms = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[kommo:test] ✗ ${label} (${ms}ms): ${error}`);
    return [label, { ok: false, ms, error }];
  }
}

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return Response.json({ error: "No autorizado." }, { status: 403 });
  }

  const results: Record<string, CheckResult> = {};
  const overall = { start: Date.now(), ok: true };

  // ── Infraestructura OAuth ─────────────────────────────────────────
  const [, tokenCheck] = await check("token", async () => {
    const token = await getValidToken();
    return { tokenLength: token.length, prefix: token.slice(0, 8) + "…" };
  });
  results["token"] = tokenCheck;
  if (!tokenCheck.ok) overall.ok = false;

  // ── Cuenta ───────────────────────────────────────────────────────
  const [, accountCheck] = await check("account", () =>
    kommoFetch<{ id: number; name: string; subdomain: string }>("/account"),
  );
  results["account"] = accountCheck;
  if (!accountCheck.ok) overall.ok = false;

  // ── Pipelines ────────────────────────────────────────────────────
  const [, pipelinesCheck] = await check("pipelines", async () => {
    const res = await kommoFetch<{
      _embedded: { pipelines: Array<{ id: number; name: string; _embedded: { statuses: Array<{ id: number; name: string }> } }> };
    }>("/leads/pipelines");
    const pipelines = res._embedded?.pipelines ?? [];
    return {
      count: pipelines.length,
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        statuses: p._embedded?.statuses?.map((s) => ({ id: s.id, name: s.name })) ?? [],
      })),
    };
  });
  results["pipelines"] = pipelinesCheck;
  if (!pipelinesCheck.ok) overall.ok = false;

  // ── Usuarios ─────────────────────────────────────────────────────
  const [, usersCheck] = await check("users", async () => {
    const res = await kommoFetch<{
      _embedded: { users: Array<{ id: number; name: string; email: string }> };
    }>("/users");
    const users = res._embedded?.users ?? [];
    return {
      count: users.length,
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email })),
    };
  });
  results["users"] = usersCheck;
  if (!usersCheck.ok) overall.ok = false;

  // ── Contactos ────────────────────────────────────────────────────
  const [, contactsCheck] = await check("contacts", async () => {
    const res = await kommoFetch<{
      _embedded: { contacts: Array<{ id: number; name: string }> };
    }>("/contacts?limit=5");
    const contacts = res._embedded?.contacts ?? [];
    return {
      count: contacts.length,
      sample: contacts.map((c) => ({ id: c.id, name: c.name })),
    };
  });
  results["contacts"] = contactsCheck;
  if (!contactsCheck.ok) overall.ok = false;

  // ── Campos personalizados disponibles ────────────────────────────
  const [, customFieldsCheck] = await check("custom_fields", async () => {
    const [leadsFields, contactsFields] = await Promise.all([
      kommoFetch<{ _embedded: { custom_fields: Array<{ id: number; name: string; type: string }> } }>(
        "/leads/custom_fields",
      ).catch(() => ({ _embedded: { custom_fields: [] } })),
      kommoFetch<{ _embedded: { custom_fields: Array<{ id: number; name: string; type: string }> } }>(
        "/contacts/custom_fields",
      ).catch(() => ({ _embedded: { custom_fields: [] } })),
    ]);
    return {
      leads: leadsFields._embedded?.custom_fields?.map((f) => ({ id: f.id, name: f.name, type: f.type })) ?? [],
      contacts: contactsFields._embedded?.custom_fields?.map((f) => ({ id: f.id, name: f.name, type: f.type })) ?? [],
    };
  });
  results["custom_fields"] = customFieldsCheck;

  // ── Config env vars ──────────────────────────────────────────────
  const [, configCheck] = await check("config", async () => {
    const cfg = getKommoConfig();
    return {
      pipelines: cfg.pipelines,
      statuses: cfg.statuses,
      users: cfg.users,
      customFields: cfg.customFields,
      warnings: [
        !cfg.pipelines.orders && "KOMMO_PIPELINE_ORDERS_ID no configurado — Kommo usará pipeline por defecto",
        !cfg.statuses.newOrder && "KOMMO_STATUS_NEW_ORDER_ID no configurado",
        !cfg.users.defaultResponsible && "KOMMO_DEFAULT_USER_ID no configurado",
      ].filter(Boolean),
    };
  });
  results["config"] = configCheck;

  // ── Dry-run mappers (sin llamadas a API) ─────────────────────────
  const [, mappersCheck] = await check("mappers_dry_run", async () => {
    const mockUser = {
      id: "test-user-id",
      fullName: "Juan Pérez",
      email: "juan@test.com",
      phone: "3001234567",
      whatsappPhone: "573001234567",
      company: "Empresa Test",
      city: "Bogotá",
      department: "Cundinamarca",
      level: "AQUA",
    };

    const mockOrder = {
      id: "test-order-id-abc123",
      customerName: "Juan Pérez",
      customerEmail: "juan@test.com",
      customerPhone: "3001234567",
      company: "Empresa Test",
      department: "Cundinamarca",
      city: "Bogotá",
      addressLine1: "Cra 7 # 32-16",
      subtotal: 150000,
      totalItems: 3,
      paymentStatus: "PENDING",
      items: [
        { name: "Dispensador de Jabón KlinOx", quantity: 2, unitPrice: 55000 },
        { name: "Dispensador de Papel Higiénico", quantity: 1, unitPrice: 40000 },
      ],
    };

    const contact = mapUserToContact(mockUser);
    const deal = mapOrderToLead(mockOrder, 12345);
    const note = mapOrderToNote(mockOrder);
    const tag = orderTag(mockOrder.id);

    return { contact, deal, note, tag };
  });
  results["mappers_dry_run"] = mappersCheck;
  if (!mappersCheck.ok) overall.ok = false;

  const totalMs = Date.now() - overall.start;

  return Response.json(
    { ok: overall.ok, totalMs, checks: results },
    { status: overall.ok ? 200 : 207 },
  );
}

import { requirePermission } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

// Lista editable de materiales de Inyección, guardada en AppConfig.
const KEY = "production_materials";
const DEFAULT_MATERIALS = [
  "ABS NEGRO",
  "ABS BLANCO",
  "ABS NATURAL",
  "11H01A",
  "11H01-R2",
  "CRISTAL",
  "POLICARBONATO",
  "P.P BAJA",
  "ALTO IMPACTO",
  "P-07",
  "SILICONA DUREZA 60",
  "SILICONA DUREZA 45",
  "SILICONA DUREZA 30",
];
const MANAGER_ROLES = ["JEFE_OPERACIONES", "DIRECTOR_OPERACIONES"];

async function getMaterials(): Promise<string[]> {
  const row = await prisma?.appConfig.findUnique({ where: { key: KEY } });
  if (!row) return DEFAULT_MATERIALS;
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === "string") : DEFAULT_MATERIALS;
  } catch {
    return DEFAULT_MATERIALS;
  }
}

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const materials = await getMaterials();
  return Response.json({ materials, canAdd: isSuperAdmin(access.user) || MANAGER_ROLES.includes(access.user.role) });
}

export async function POST(req: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!isSuperAdmin(access.user) && !MANAGER_ROLES.includes(access.user.role)) {
    return Response.json({ error: "Solo el jefe de operaciones puede agregar materiales" }, { status: 403 });
  }
  if (!prisma) return Response.json({ error: "Sin base de datos" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ").toUpperCase().slice(0, 60) : "";
  if (!name) return Response.json({ error: "Escribe el nombre del material" }, { status: 400 });

  const materials = await getMaterials();
  if (materials.includes(name)) return Response.json({ error: "Ese material ya existe" }, { status: 409 });
  const next = [...materials, name];
  await prisma.appConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return Response.json({ materials: next, name });
}

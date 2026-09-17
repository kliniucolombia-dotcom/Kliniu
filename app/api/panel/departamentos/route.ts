import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { DOC_DEPARTMENTS, PRODUCTION_AREAS, getDocDepartment } from "@/lib/production-departments";

const MEMBER_EMAILS = DOC_DEPARTMENTS.flatMap((d) => d.members.map((m) => m.email));

const OTHER_AREA = {
  key: "OTROS",
  name: "Otras áreas",
  description: "Departamentos sin área asignada.",
};

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ areas: [], stats: { areas: 0, departments: 0, people: 0, activeAccounts: 0 } });

  const [departments, users] = await Promise.all([
    prisma.productionDepartment.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { email: { in: MEMBER_EMAILS } },
      select: { id: true, fullName: true, email: true, role: true, status: true, avatarUrl: true },
    }),
  ]);

  const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  const registeredCodes = new Set(departments.map((d) => d.code));
  const missingDoc = DOC_DEPARTMENTS.filter((d) => !registeredCodes.has(d.code)).map((d) => ({
    id: "",
    name: d.name,
    code: d.code,
    description: d.description,
    area: d.area,
    isActive: true,
  }));

  const all = [...departments, ...missingDoc];

  const mapped = all.map((d) => {
    const doc = getDocDepartment(d.code) ?? DOC_DEPARTMENTS.find((x) => x.name === d.name);
    const members = (doc?.members ?? []).map((m) => {
      const account = userByEmail.get(m.email.toLowerCase()) ?? null;
      return {
        name: account?.fullName ?? m.name,
        title: m.title,
        kind: m.kind,
        email: m.email,
        account: account
          ? {
              id: account.id,
              fullName: account.fullName,
              role: account.role,
              status: account.status,
              avatarUrl: account.avatarUrl,
            }
          : null,
      };
    });
    const backup = members.find((m) => m.kind === "backup");
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      area: d.area ?? doc?.area ?? null,
      isActive: d.isActive,
      members,
      backupName: backup?.name ?? null,
    };
  });

  const knownKeys = new Set(PRODUCTION_AREAS.map((a) => a.key));
  const areas = PRODUCTION_AREAS.map((a) => ({
    ...a,
    departments: mapped.filter((d) => d.area === a.key),
  }));

  const orphans = mapped.filter((d) => !d.area || !knownKeys.has(d.area));
  if (orphans.length) areas.push({ ...OTHER_AREA, departments: orphans });

  const accountIds = new Set<string>();
  const activeIds = new Set<string>();
  const responsableIds = new Set<string>();
  mapped.forEach((d) =>
    d.members.forEach((m) => {
      if (m.kind === "holder" && m.account) responsableIds.add(m.account.id);
      if (!m.account) return;
      accountIds.add(m.account.id);
      if (m.account.status === "ACTIVE") activeIds.add(m.account.id);
    }),
  );

  const areasCount = new Set(mapped.map((d) => d.area).filter(Boolean)).size;

  return Response.json({
    areas,
    stats: {
      areas: areasCount,
      departments: areasCount,
      units: mapped.length,
      people: accountIds.size,
      responsables: responsableIds.size,
      activeAccounts: activeIds.size,
    },
  });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { name, code, description, area } = (await request.json()) as {
    name?: string;
    code?: string;
    description?: string;
    area?: string;
  };

  if (!name?.trim() || !code?.trim()) {
    return Response.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
  }

  const exists = await prisma.productionDepartment.findFirst({
    where: { OR: [{ name: name.trim() }, { code: code.trim().toUpperCase() }] },
  });
  if (exists) return Response.json({ error: "Ya existe un departamento con ese nombre o código" }, { status: 409 });

  const department = await prisma.productionDepartment.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      area: area?.trim() || null,
    },
  });

  return Response.json(department, { status: 201 });
}

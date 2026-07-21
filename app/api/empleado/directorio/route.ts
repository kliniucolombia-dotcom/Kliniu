import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const EMPLOYEE_SELECT = {
  id: true,
  jobTitle: true,
  site: true,
  managerId: true,
  hireDate: true,
  contractType: true,
  departmentId: true,
  user: { select: { fullName: true, email: true, phone: true, city: true, avatarUrl: true } },
} as const;

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const me = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!me) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const [departments, employees] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { user: { fullName: "asc" } },
      select: EMPLOYEE_SELECT,
    }),
  ]);

  // Reportes directos por jefe: alimenta "tiene a cargo" y el conteo de líderes.
  const reportCounts = new Map<string, number>();
  employees.forEach((e) => {
    if (e.managerId) reportCounts.set(e.managerId, (reportCounts.get(e.managerId) ?? 0) + 1);
  });

  const sites = Array.from(new Set(employees.map((e) => e.site).filter(Boolean))) as string[];
  const jobTitles = Array.from(new Set(employees.map((e) => e.jobTitle))).sort();

  return Response.json({
    meId: me.id,
    departments,
    employees: employees.map((e) => ({ ...e, directReports: reportCounts.get(e.id) ?? 0 })),
    sites: sites.sort(),
    jobTitles,
    stats: {
      totalEmployees: employees.length,
      totalDepartments: departments.length,
      totalLeaders: reportCounts.size,
      totalSites: sites.length,
    },
  });
}

import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const EMPLOYEE_SELECT = {
  id: true,
  jobTitle: true,
  site: true,
  managerId: true,
  hireDate: true,
  contractType: true,
  departmentId: true,
  user: { select: { fullName: true, email: true, phone: true, city: true, avatarUrl: true, role: true } },
} as const;

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const me = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!me) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const [departments, allEmployees] = await Promise.all([
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

  // Reportes directos por jefe: alimenta "tiene a cargo" y el conteo de líderes (sobre toda la compañía).
  const reportCounts = new Map<string, number>();
  allEmployees.forEach((e) => {
    if (e.managerId) reportCounts.set(e.managerId, (reportCounts.get(e.managerId) ?? 0) + 1);
  });

  // Un empleado normal solo ve su propio círculo laboral: su jefe, el jefe de
  // su jefe (para dar contexto de jerarquía), sus compañeros de departamento
  // y Recursos Humanos. RRHH/SUPERADMIN ven todo.
  const isFullAccess = isRRHH(access.user);
  const jefe = allEmployees.find((e) => e.id === me.managerId) ?? null;
  const employees = isFullAccess
    ? allEmployees
    : allEmployees.filter((e) =>
        e.id === me.id ||
        e.id === me.managerId ||
        (jefe && e.id === jefe.managerId) ||
        (me.departmentId && e.departmentId === me.departmentId) ||
        e.user.role === "RRHH",
      );

  const sites = Array.from(new Set(employees.map((e) => e.site).filter(Boolean))) as string[];
  const jobTitles = Array.from(new Set(employees.map((e) => e.jobTitle))).sort();

  return Response.json({
    meId: me.id,
    departments,
    employees: employees.map((e) => ({
      id: e.id,
      jobTitle: e.jobTitle,
      site: e.site,
      managerId: e.managerId,
      hireDate: e.hireDate,
      contractType: e.contractType,
      departmentId: e.departmentId,
      directReports: reportCounts.get(e.id) ?? 0,
      isRRHH: e.user.role === "RRHH",
      user: { fullName: e.user.fullName, email: e.user.email, phone: e.user.phone, city: e.user.city, avatarUrl: e.user.avatarUrl },
    })),
    sites: sites.sort(),
    jobTitles,
    stats: {
      totalEmployees: employees.length,
      totalDepartments: isFullAccess ? departments.length : new Set(employees.map((e) => e.departmentId).filter(Boolean)).size,
      totalLeaders: reportCounts.size,
      totalSites: sites.length,
    },
  });
}

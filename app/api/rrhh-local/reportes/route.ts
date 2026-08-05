import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const fromParam = params.get("from");
  const toParam = params.get("to");

  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth() - 5, 1);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  to.setUTCHours(23, 59, 59, 999);

  const range = { gte: from, lte: to };

  const [payslips, timeOff, attendance, overtime, tickets, employees] = await Promise.all([
    prisma.payslip.findMany({
      where: { createdAt: range },
      select: { period: true, grossAmount: true, deductions: true, netAmount: true },
    }),
    prisma.timeOffRequest.findMany({
      where: { startDate: range },
      select: { type: true, status: true, durationDays: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      where: { date: range },
      _count: { _all: true },
    }),
    prisma.overtimeRequest.findMany({
      where: { date: range },
      select: { overtimeType: true, status: true, hours: true },
    }),
    prisma.ticket.findMany({
      where: { createdAt: range },
      select: { status: true, category: { select: { name: true } } },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { contractType: true, department: { select: { name: true } } },
    }),
  ]);

  const byKey = <T>(rows: T[], key: (row: T) => string, value: (row: T) => number) => {
    const map = new Map<string, number>();
    for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + value(row));
    return Array.from(map.entries()).map(([label, total]) => ({ label, total }));
  };

  return Response.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    nomina: {
      totalNeto: payslips.reduce((acc, p) => acc + p.netAmount, 0),
      totalBruto: payslips.reduce((acc, p) => acc + p.grossAmount, 0),
      totalDeducciones: payslips.reduce((acc, p) => acc + p.deductions, 0),
      desprendibles: payslips.length,
      porPeriodo: byKey(payslips, (p) => p.period, (p) => p.netAmount).sort((a, b) => a.label.localeCompare(b.label)),
    },
    ausentismo: {
      diasAprobados: timeOff.filter((r) => r.status === "APPROVED").reduce((acc, r) => acc + r.durationDays, 0),
      solicitudes: timeOff.length,
      porTipo: byKey(timeOff.filter((r) => r.status === "APPROVED"), (r) => r.type, (r) => r.durationDays),
      porEstado: byKey(timeOff, (r) => r.status, () => 1),
    },
    asistencia: attendance.map((a) => ({ label: a.status, total: a._count._all })),
    horasExtra: {
      horasAprobadas: overtime.filter((r) => r.status === "APPROVED").reduce((acc, r) => acc + r.hours, 0),
      solicitudes: overtime.length,
      porTipo: byKey(overtime.filter((r) => r.status === "APPROVED"), (r) => r.overtimeType, (r) => r.hours),
    },
    tickets: {
      total: tickets.length,
      porCategoria: byKey(tickets, (t) => t.category.name, () => 1),
      porEstado: byKey(tickets, (t) => t.status, () => 1),
    },
    plantilla: {
      activos: employees.length,
      porDepartamento: byKey(employees, (e) => e.department?.name ?? "Sin departamento", () => 1),
      porContrato: byKey(employees, (e) => e.contractType, () => 1),
    },
  });
}

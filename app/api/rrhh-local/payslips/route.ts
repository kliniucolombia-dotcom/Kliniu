import { isRRHH } from "@/lib/roles";
import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { apiHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const GET = apiHandler(async (request: Request) => {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const employeeIdParam = new URL(request.url).searchParams.get("employeeId");

  if (isRRHH(access.user)) {
    const payslips = await prisma.payslip.findMany({
      where: employeeIdParam ? { employeeId: employeeIdParam } : undefined,
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(payslips);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(payslips);
});

export const POST = apiHandler(async (request: Request) => {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const body = await request.json();
  const {
    employeeId, period, grossAmount, deductions, fileUrl, fileName,
    paymentDueDate, epsAmount, arlAmount, pensionAmount,
  } = body as {
    employeeId?: string;
    period?: string;
    grossAmount?: number;
    deductions?: number;
    fileUrl?: string;
    fileName?: string;
    paymentDueDate?: string;
    epsAmount?: number;
    arlAmount?: number;
    pensionAmount?: number;
  };

  if (!employeeId || !period?.trim() || typeof grossAmount !== "number" || typeof deductions !== "number") {
    return Response.json({ error: "employeeId, period, grossAmount y deductions son obligatorios" }, { status: 400 });
  }

  const payslip = await prisma.payslip.create({
    data: {
      employeeId,
      period: period.trim(),
      grossAmount,
      deductions,
      netAmount: grossAmount - deductions,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      epsAmount: typeof epsAmount === "number" ? epsAmount : null,
      arlAmount: typeof arlAmount === "number" ? arlAmount : null,
      pensionAmount: typeof pensionAmount === "number" ? pensionAmount : null,
    },
  });
  await broadcastPanelUpdate("payslips");
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, select: { user: { select: { fullName: true } } } });
  // Sin montos: la bitácora dice qué desprendible se creó, no cuánto paga.
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "payslip.create", entity: "payslip", entityId: payslip.id,
    meta: { name: `${emp?.user.fullName ?? "Empleado"} · ${payslip.period}` }, ip: getClientIp(request),
  });
  return Response.json(payslip, { status: 201 });
});

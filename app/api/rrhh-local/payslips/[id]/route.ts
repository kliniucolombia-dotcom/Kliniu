import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { apiHandler } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const PATCH = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const { id } = await params;
  const body = await request.json();
  const { isPaid, paymentDueDate, epsAmount, arlAmount, pensionAmount } = body as {
    isPaid?: boolean;
    paymentDueDate?: string | null;
    epsAmount?: number | null;
    arlAmount?: number | null;
    pensionAmount?: number | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof isPaid === "boolean") {
    data.isPaid = isPaid;
    data.paidAt = isPaid ? new Date() : null;
  }
  if (paymentDueDate !== undefined) data.paymentDueDate = paymentDueDate ? new Date(paymentDueDate) : null;
  if (epsAmount !== undefined) data.epsAmount = epsAmount;
  if (arlAmount !== undefined) data.arlAmount = arlAmount;
  if (pensionAmount !== undefined) data.pensionAmount = pensionAmount;

  const payslip = await prisma.payslip.update({ where: { id }, data, include: { employee: { select: { user: { select: { fullName: true } } } } } });
  await broadcastPanelUpdate("payslips");
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "payslip.update", entity: "payslip", entityId: id,
    meta: { name: `${payslip.employee.user.fullName} · ${payslip.period}`, ...(typeof isPaid === "boolean" ? { changes: { isPaid: { from: !isPaid, to: isPaid } } } : { alsoChanged: Object.keys(data) }) }, ip: getClientIp(request),
  });
  return Response.json(payslip);
});

export const DELETE = apiHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const { id } = await params;
  const before = await prisma.payslip.findUnique({ where: { id }, select: { period: true, employee: { select: { user: { select: { fullName: true } } } } } });
  await prisma.payslip.delete({ where: { id } });
  await broadcastPanelUpdate("payslips");
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "payslip.delete", entity: "payslip", entityId: id,
    meta: { name: before ? `${before.employee.user.fullName} · ${before.period}` : undefined }, ip: getClientIp(request),
  });
  return Response.json({ ok: true });
});

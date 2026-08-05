import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

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

  const payslip = await prisma.payslip.update({ where: { id }, data });
  await broadcastPanelUpdate("payslips");
  return Response.json(payslip);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  await prisma.payslip.delete({ where: { id } });
  await broadcastPanelUpdate("payslips");
  return Response.json({ ok: true });
}

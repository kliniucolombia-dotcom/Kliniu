import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const payslips = await prisma.payslip.findMany({
    orderBy: [{ isPaid: "asc" }, { paymentDueDate: "asc" }],
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const pendientes = payslips.filter((p) => !p.isPaid);
  const kpis = {
    montoPendiente: pendientes.reduce((acc, p) => acc + p.netAmount, 0),
    cantidadPendiente: pendientes.length,
    proximos7Dias: pendientes.filter((p) => p.paymentDueDate && p.paymentDueDate <= in7Days).length,
    sinFecha: pendientes.filter((p) => !p.paymentDueDate).length,
    pagadoEsteMes: payslips
      .filter((p) => p.isPaid && p.paidAt && p.paidAt >= monthStart)
      .reduce((acc, p) => acc + p.netAmount, 0),
  };

  return Response.json({ payslips, kpis });
}

import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const params = new URL(request.url).searchParams;
  const fromParam = params.get("from");
  const toParam = params.get("to");
  const to = toParam ? new Date(toParam) : new Date();
  const from = fromParam ? new Date(fromParam) : new Date(to.getFullYear(), to.getMonth() - 5, 1);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  to.setUTCHours(23, 59, 59, 999);

  const payslips = await prisma.payslip.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { period: true, deductions: true, epsAmount: true, arlAmount: true, pensionAmount: true },
  });

  const conDesglose = payslips.filter((p) => p.epsAmount !== null || p.arlAmount !== null || p.pensionAmount !== null);

  const byPeriod = new Map<string, { eps: number; arl: number; pension: number; deducciones: number }>();
  for (const p of payslips) {
    const row = byPeriod.get(p.period) ?? { eps: 0, arl: 0, pension: 0, deducciones: 0 };
    row.eps += p.epsAmount ?? 0;
    row.arl += p.arlAmount ?? 0;
    row.pension += p.pensionAmount ?? 0;
    row.deducciones += p.deductions;
    byPeriod.set(p.period, row);
  }

  return Response.json({
    range: { from: from.toISOString(), to: to.toISOString() },
    totales: {
      eps: payslips.reduce((acc, p) => acc + (p.epsAmount ?? 0), 0),
      arl: payslips.reduce((acc, p) => acc + (p.arlAmount ?? 0), 0),
      pension: payslips.reduce((acc, p) => acc + (p.pensionAmount ?? 0), 0),
      deducciones: payslips.reduce((acc, p) => acc + p.deductions, 0),
    },
    desprendibles: payslips.length,
    conDesglose: conDesglose.length,
    porPeriodo: Array.from(byPeriod.entries())
      .map(([period, v]) => ({ period, ...v }))
      .sort((a, b) => a.period.localeCompare(b.period)),
  });
}

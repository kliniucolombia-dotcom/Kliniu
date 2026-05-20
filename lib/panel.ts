import { prisma } from "@/lib/prisma";

// ─── ROAS helpers ───────────────────────────────────────────────

export function calcROAS(sales: number, investment: number): number {
  if (investment <= 0) return 0;
  return sales / investment;
}

export function calcCompliance(sales: number, investment: number, target = 10): number {
  if (investment <= 0) return 0;
  const roas = calcROAS(sales, investment);
  return Math.min(200, Math.round((roas / target) * 100));
}

export type CampaignStatus = "excellent" | "acceptable" | "risk" | "bad" | "pending";

export function getCampaignStatus(roas: number): CampaignStatus {
  if (roas === 0) return "pending";
  if (roas >= 10) return "excellent";
  if (roas >= 7) return "acceptable";
  if (roas >= 4) return "risk";
  return "bad";
}

export const STATUS_META: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  excellent:  { label: "Excelente",     color: "#16A34A", bg: "#DCFCE7" },
  acceptable: { label: "Aceptable",     color: "#D97706", bg: "#FEF3C7" },
  risk:       { label: "Riesgo",        color: "#EA580C", bg: "#FFEDD5" },
  bad:        { label: "Mala campaña",  color: "#DC2626", bg: "#FEE2E2" },
  pending:    { label: "Sin datos",     color: "#6B7280", bg: "#F3F4F6" },
};

// ─── DB helpers ─────────────────────────────────────────────────

export async function getDashboardStats() {
  if (!prisma) return null;

  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayOrders, monthOrders, campaigns, products, newCustomers] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: startOfDay }, status: { not: "CANCELLED" } }, select: { subtotal: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } }, select: { subtotal: true, userId: true } }),
    prisma.campaign.findMany({ include: { seller: { select: { id: true, fullName: true } }, product: { select: { name: true, image: true } } } }),
    prisma.product.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfMonth } } }),
  ]);

  const todayTotal  = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const monthTotal  = monthOrders.reduce((s, o) => s + o.subtotal, 0);
  const totalInvestment = campaigns.reduce((s, c) => s + c.investment, 0);
  const totalSales      = campaigns.reduce((s, c) => s + c.sales, 0);
  const roasGeneral     = calcROAS(totalSales, totalInvestment);

  const atRisk = campaigns.filter((c) => {
    const r = calcROAS(c.sales, c.investment);
    return r > 0 && r < 7;
  }).length;

  // Top product from orders this month
  const itemCounts: Record<string, { name: string; qty: number }> = {};
  const monthOrderItems = await prisma.orderItem.findMany({
    where: { order: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } } },
    select: { productId: true, name: true, quantity: true },
  });
  for (const item of monthOrderItems) {
    if (!itemCounts[item.productId]) itemCounts[item.productId] = { name: item.name, qty: 0 };
    itemCounts[item.productId].qty += item.quantity;
  }
  const topProduct = Object.values(itemCounts).sort((a, b) => b.qty - a.qty)[0] ?? null;

  // Top seller by campaign sales
  const sellerSales: Record<string, { name: string; total: number }> = {};
  for (const c of campaigns) {
    const sid = c.seller.id;
    if (!sellerSales[sid]) sellerSales[sid] = { name: c.seller.fullName, total: 0 };
    sellerSales[sid].total += c.sales;
  }
  const topSeller = Object.values(sellerSales).sort((a, b) => b.total - a.total)[0] ?? null;

  const uniqueCustomers = new Set(monthOrders.map((o) => o.userId)).size;
  const avgTicket = monthOrders.length > 0 ? Math.round(monthTotal / monthOrders.length) : 0;

  return {
    todayTotal,
    monthTotal,
    totalInvestment,
    totalSales,
    roasGeneral,
    atRisk,
    topProduct,
    topSeller,
    campaigns: campaigns.length,
    activeProducts: products,
    newCustomers,
    uniqueCustomers,
    avgTicket,
    monthOrderCount: monthOrders.length,
  };
}

export async function getProductsForPanel(sellerId?: string) {
  if (!prisma) return [];
  return prisma.product.findMany({
    where: { active: true },
    include: {
      priceHistory: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { fullName: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function updateProductPrice(
  productId: string,
  newPrice: number,
  userId: string,
  note?: string,
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { price: true } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { previousPrice: product.price, price: newPrice, updatedAt: new Date() } }),
    prisma.priceHistory.create({ data: { productId, oldPrice: product.price, newPrice, changedBy: userId, note: note ?? null } }),
  ]);
}

export async function getCampaignsForPanel(sellerId?: string) {
  if (!prisma) return [];
  return prisma.campaign.findMany({
    where: sellerId ? { sellerId } : undefined,
    include: {
      seller: { select: { id: true, fullName: true, email: true } },
      product: { select: { id: true, name: true, image: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMetrics(sellerId?: string) {
  if (!prisma) return null;

  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString("es-CO", { month: "short" }),
      start: new Date(d.getFullYear(), d.getMonth(), 1),
      end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
    });
  }

  const monthlyData = await Promise.all(
    months.map(async (m) => {
      const orders = await prisma!.order.findMany({
        where: { createdAt: { gte: m.start, lte: m.end }, status: { not: "CANCELLED" } },
        select: { subtotal: true },
      });
      return { label: m.label, total: orders.reduce((s, o) => s + o.subtotal, 0), count: orders.length };
    }),
  );

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    select: { id: true, fullName: true, email: true, campaigns: { select: { sales: true, investment: true } } },
  });

  const sellerRanking = sellers.map((s) => ({
    id: s.id,
    name: s.fullName,
    email: s.email,
    totalSales: s.campaigns.reduce((sum, c) => sum + c.sales, 0),
    totalInvestment: s.campaigns.reduce((sum, c) => sum + c.investment, 0),
    roas: calcROAS(
      s.campaigns.reduce((sum, c) => sum + c.sales, 0),
      s.campaigns.reduce((sum, c) => sum + c.investment, 0),
    ),
  })).sort((a, b) => b.totalSales - a.totalSales);

  return { monthlyData, sellerRanking };
}

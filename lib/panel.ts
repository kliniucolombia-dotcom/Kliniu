import { prisma } from "@/lib/prisma";
import { buildSaleCalculatorSummary, sanitizeSaleCalcNumber, sanitizePct } from "@/lib/sale-calculator";
import { buildQuotationSummary, calcLineTotal, type QuotationTaxConfigInput } from "@/lib/quotation-calculator";
import { buildProductionSummary, sanitizeProductionNumber, type ProductionRunInput } from "@/lib/production-calculator";

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
  const dayOfWeek    = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday = 0
  const startOfWeek  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

  const [todayOrders, weekOrders, monthOrders, campaigns, products, newCustomers] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: startOfDay }, status: { not: "CANCELLED" } }, select: { subtotal: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: startOfWeek }, status: { not: "CANCELLED" } }, select: { subtotal: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } }, select: { subtotal: true, userId: true } }),
    prisma.campaign.findMany({ include: { seller: { select: { id: true, fullName: true } }, product: { select: { name: true, image: true } } } }),
    prisma.product.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: startOfMonth } } }),
  ]);

  const todayTotal  = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const weekTotal   = weekOrders.reduce((s, o) => s + o.subtotal, 0);
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
    weekTotal,
    weekOrderCount: weekOrders.length,
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

export async function getSellerStats() {
  if (!prisma) return [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayOfWeek    = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const startOfWeek  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    select: {
      id: true,
      fullName: true,
      email: true,
      whatsappPhone: true,
      assignedOrders: {
        where: { status: { not: "CANCELLED" } },
        select: { subtotal: true, createdAt: true, shippingStatus: true },
      },
    },
    orderBy: { fullName: "asc" },
  });

  return sellers.map((s) => {
    const allOrders   = s.assignedOrders;
    const weekOrders  = allOrders.filter((o) => new Date(o.createdAt) >= startOfWeek);
    const monthOrders = allOrders.filter((o) => new Date(o.createdAt) >= startOfMonth);

    return {
      id:          s.id,
      name:        s.fullName,
      email:       s.email,
      phone:       s.whatsappPhone,
      totalOrders: allOrders.length,
      weekOrders:  weekOrders.length,
      weekTotal:   weekOrders.reduce((sum, o) => sum + o.subtotal, 0),
      monthOrders: monthOrders.length,
      monthTotal:  monthOrders.reduce((sum, o) => sum + o.subtotal, 0),
      pending:     allOrders.filter((o) => o.shippingStatus === "PENDING").length,
      shipped:     allOrders.filter((o) => o.shippingStatus === "SHIPPED").length,
      delivered:   allOrders.filter((o) => o.shippingStatus === "DELIVERED").length,
    };
  });
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

// ─── Matriz diaria de campaña ───────────────────────────────────

function sanitizeNumber(value: unknown): number {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export async function getCampaignDailyEntries(campaignId: string) {
  if (!prisma) return [];
  const rows = await prisma.campaignDaily.findMany({
    where: { campaignId },
    orderBy: { fecha: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    fecha: r.fecha.toISOString(),
    mensajes: r.mensajes,
    transacciones: r.transacciones,
    presupuestoPublicidad: r.presupuestoPublicidad,
    ventaDelDia: r.ventaDelDia,
  }));
}

export async function createCampaignDailyEntry(
  campaignId: string,
  data: { fecha: string; mensajes?: number; transacciones?: number; presupuestoPublicidad?: number; ventaDelDia?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const fecha = new Date(data.fecha);
  if (Number.isNaN(fecha.getTime())) throw new Error("FECHA_INVALIDA");

  return prisma.campaignDaily.create({
    data: {
      campaignId,
      fecha,
      mensajes: sanitizeNumber(data.mensajes),
      transacciones: sanitizeNumber(data.transacciones),
      presupuestoPublicidad: sanitizeNumber(data.presupuestoPublicidad),
      ventaDelDia: sanitizeNumber(data.ventaDelDia),
    },
  });
}

export async function updateCampaignDailyEntry(
  id: string,
  data: { fecha?: string; mensajes?: number; transacciones?: number; presupuestoPublicidad?: number; ventaDelDia?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.campaignDaily.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");

  let fecha = existing.fecha;
  if (data.fecha !== undefined) {
    const parsed = new Date(data.fecha);
    if (Number.isNaN(parsed.getTime())) throw new Error("FECHA_INVALIDA");
    fecha = parsed;
  }

  try {
    return await prisma.campaignDaily.update({
      where: { id },
      data: {
        fecha,
        mensajes: data.mensajes !== undefined ? sanitizeNumber(data.mensajes) : existing.mensajes,
        transacciones: data.transacciones !== undefined ? sanitizeNumber(data.transacciones) : existing.transacciones,
        presupuestoPublicidad: data.presupuestoPublicidad !== undefined ? sanitizeNumber(data.presupuestoPublicidad) : existing.presupuestoPublicidad,
        ventaDelDia: data.ventaDelDia !== undefined ? sanitizeNumber(data.ventaDelDia) : existing.ventaDelDia,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) throw new Error("FECHA_DUPLICADA");
    throw err;
  }
}

export async function deleteCampaignDailyEntry(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.campaignDaily.delete({ where: { id } });
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

// ─── Calculadora de precio de venta ─────────────────────────────

function toSaleCalcItemInput(item: { id: string; cantidad: number; costoUnitario: number }) {
  return { id: item.id, cantidad: item.cantidad, costoUnitario: item.costoUnitario };
}

function toSaleCalcConfig(calc: { envio: number; picking: number; comisionPct: number; margenPct: number; campanaPct: number }) {
  return { envio: calc.envio, picking: calc.picking, comisionPct: calc.comisionPct, margenPct: calc.margenPct, campanaPct: calc.campanaPct };
}

export async function getSaleCalculators(userId: string) {
  if (!prisma) return [];
  const calculators = await prisma.saleCalculator.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { updatedAt: "desc" },
  });
  return calculators.map((c) => ({
    id: c.id,
    name: c.name,
    updatedAt: c.updatedAt.toISOString(),
    summary: buildSaleCalculatorSummary(c.items.map(toSaleCalcItemInput), toSaleCalcConfig(c)),
  }));
}

export async function getSaleCalculatorWithItems(id: string) {
  if (!prisma) return null;
  const calc = await prisma.saleCalculator.findUnique({ where: { id }, include: { items: true } });
  if (!calc) return null;
  return {
    id: calc.id,
    userId: calc.userId,
    name: calc.name,
    envio: calc.envio,
    picking: calc.picking,
    comisionPct: calc.comisionPct,
    margenPct: calc.margenPct,
    campanaPct: calc.campanaPct,
    items: calc.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      nombreProducto: i.nombreProducto,
      cantidad: i.cantidad,
      costoUnitario: i.costoUnitario,
    })),
    summary: buildSaleCalculatorSummary(calc.items.map(toSaleCalcItemInput), toSaleCalcConfig(calc)),
  };
}

export async function createSaleCalculator(userId: string, name?: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.saleCalculator.create({ data: { userId, name: name?.trim() || "Nuevo combo" } });
}

export async function updateSaleCalculator(
  id: string,
  data: { name?: string; envio?: number; picking?: number; comisionPct?: number; margenPct?: number; campanaPct?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.saleCalculator.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() || "Nuevo combo" } : {}),
      ...(data.envio !== undefined ? { envio: sanitizeSaleCalcNumber(data.envio) } : {}),
      ...(data.picking !== undefined ? { picking: sanitizeSaleCalcNumber(data.picking) } : {}),
      ...(data.comisionPct !== undefined ? { comisionPct: sanitizePct(data.comisionPct) } : {}),
      ...(data.margenPct !== undefined ? { margenPct: sanitizePct(data.margenPct) } : {}),
      ...(data.campanaPct !== undefined ? { campanaPct: sanitizePct(data.campanaPct) } : {}),
    },
  });
}

export async function deleteSaleCalculator(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.saleCalculator.delete({ where: { id } });
}

export async function duplicateSaleCalculator(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const original = await prisma.saleCalculator.findUnique({ where: { id }, include: { items: true } });
  if (!original) throw new Error("NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const copy = await tx.saleCalculator.create({
      data: {
        userId: original.userId,
        name: `${original.name} (copia)`,
        envio: original.envio,
        picking: original.picking,
        comisionPct: original.comisionPct,
        margenPct: original.margenPct,
        campanaPct: original.campanaPct,
      },
    });
    if (original.items.length > 0) {
      await tx.saleCalculatorItem.createMany({
        data: original.items.map((item) => ({
          calculatorId: copy.id,
          productId: item.productId,
          nombreProducto: item.nombreProducto,
          cantidad: item.cantidad,
          costoUnitario: item.costoUnitario,
        })),
      });
    }
    return copy;
  });
}

export async function createSaleCalculatorItem(
  calculatorId: string,
  data: { productId?: string | null; nombreProducto: string; cantidad?: number; costoUnitario?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.saleCalculatorItem.create({
    data: {
      calculatorId,
      productId: data.productId ?? null,
      nombreProducto: data.nombreProducto.trim() || "Producto",
      cantidad: sanitizeSaleCalcNumber(data.cantidad ?? 1, { min: 1, integer: true }),
      costoUnitario: sanitizeSaleCalcNumber(data.costoUnitario ?? 0),
    },
  });
}

export async function updateSaleCalculatorItem(
  id: string,
  data: { productId?: string | null; nombreProducto?: string; cantidad?: number; costoUnitario?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.saleCalculatorItem.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");

  return prisma.saleCalculatorItem.update({
    where: { id },
    data: {
      ...(data.productId !== undefined ? { productId: data.productId } : {}),
      ...(data.nombreProducto !== undefined ? { nombreProducto: data.nombreProducto.trim() || "Producto" } : {}),
      ...(data.cantidad !== undefined ? { cantidad: sanitizeSaleCalcNumber(data.cantidad, { min: 1, integer: true }) } : {}),
      ...(data.costoUnitario !== undefined ? { costoUnitario: sanitizeSaleCalcNumber(data.costoUnitario) } : {}),
    },
  });
}

export async function deleteSaleCalculatorItem(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.saleCalculatorItem.delete({ where: { id } });
}

// ─── Cotizaciones comerciales ────────────────────────────────────

function toQuotationLineInput(item: { quantity: number; unitPrice: number }) {
  return { quantity: item.quantity, unitPrice: item.unitPrice };
}

function toQuotationTaxConfig(cfg: { reteIcaPct: number; reteFuentePct: number; ivaPct: number }): QuotationTaxConfigInput {
  return { reteIcaPct: cfg.reteIcaPct, reteFuentePct: cfg.reteFuentePct, ivaPct: cfg.ivaPct };
}

function resolveQuotationItemImage(item: { manualImageUrl: string | null; product: { image: string } | null }): string {
  return item.product?.image ?? item.manualImageUrl ?? "";
}

export async function getQuotationTaxConfig() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.quotationTaxConfig.findFirst({ where: { isActive: true } });
  if (existing) return existing;
  return prisma.quotationTaxConfig.create({ data: {} });
}

export async function updateQuotationTaxConfig(data: { reteIcaPct?: number; reteFuentePct?: number; ivaPct?: number }) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const cfg = await getQuotationTaxConfig();
  return prisma.quotationTaxConfig.update({
    where: { id: cfg.id },
    data: {
      ...(data.reteIcaPct !== undefined ? { reteIcaPct: sanitizePct(data.reteIcaPct) } : {}),
      ...(data.reteFuentePct !== undefined ? { reteFuentePct: sanitizePct(data.reteFuentePct) } : {}),
      ...(data.ivaPct !== undefined ? { ivaPct: sanitizePct(data.ivaPct) } : {}),
    },
  });
}

type QuotationTx = Parameters<Parameters<NonNullable<typeof prisma>["$transaction"]>[0]>[0];

async function generateQuotationNumber(tx: QuotationTx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;
  const count = await tx.quotation.count({ where: { number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, "0")}`;
}

export async function getQuotations(session: { userId: string; role: string }) {
  if (!prisma) return [];
  const cfg = await getQuotationTaxConfig();
  const quotations = await prisma.quotation.findMany({
    where: session.role === "ADMIN" ? {} : { sellerId: session.userId },
    include: { items: true, client: { select: { fullName: true, company: true } } },
    orderBy: { createdAt: "desc" },
  });
  return quotations.map((q) => ({
    id: q.id,
    number: q.number,
    status: q.status,
    clientName: q.client.company || q.client.fullName,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    summary: buildQuotationSummary(q.items.map(toQuotationLineInput), toQuotationTaxConfig(cfg)),
  }));
}

async function resolveExpiry<T extends { id: string; status: string; validUntil: Date | null }>(q: T): Promise<T> {
  if (!prisma) return q;
  if (q.status === "SENT" && q.validUntil && q.validUntil.getTime() < Date.now()) {
    await prisma.quotation.update({ where: { id: q.id }, data: { status: "EXPIRED" } });
    return { ...q, status: "EXPIRED" };
  }
  return q;
}

export async function getQuotationWithItems(id: string) {
  if (!prisma) return null;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { image: true } } }, orderBy: { order: "asc" } },
      client: true,
      seller: { select: { id: true, fullName: true, email: true } },
    },
  });
  if (!quotation) return null;
  const resolved = await resolveExpiry(quotation);
  const cfg = await getQuotationTaxConfig();

  return {
    id: resolved.id,
    number: resolved.number,
    status: resolved.status,
    sellerId: resolved.sellerId,
    seller: resolved.seller,
    clientId: resolved.clientId,
    client: resolved.client,
    paymentTerms: resolved.paymentTerms,
    notes: resolved.notes,
    validUntil: resolved.validUntil?.toISOString() ?? null,
    convertedOrderId: resolved.convertedOrderId,
    createdAt: resolved.createdAt.toISOString(),
    updatedAt: resolved.updatedAt.toISOString(),
    items: quotation.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      reference: i.reference,
      imageUrl: resolveQuotationItemImage(i),
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      order: i.order,
    })),
    summary: buildQuotationSummary(quotation.items.map(toQuotationLineInput), toQuotationTaxConfig(cfg)),
  };
}

export async function createQuotation(sellerId: string, clientId: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.$transaction(async (tx) => {
    const number = await generateQuotationNumber(tx);
    return tx.quotation.create({ data: { number, sellerId, clientId } });
  });
}

async function assertDraft(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const q = await prisma.quotation.findUnique({ where: { id } });
  if (!q) throw new Error("NOT_FOUND");
  if (q.status !== "DRAFT") throw new Error("NOT_EDITABLE");
  return q;
}

export async function updateQuotation(
  id: string,
  data: { clientId?: string; paymentTerms?: string | null; notes?: string | null; validUntil?: string | null },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertDraft(id);
  return prisma.quotation.update({
    where: { id },
    data: {
      ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
      ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
    },
  });
}

export async function deleteQuotation(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertDraft(id);
  await prisma.quotation.delete({ where: { id } });
}

export async function createQuotationItem(
  quotationId: string,
  data: { productId?: string | null; name?: string; reference?: string | null; manualImageUrl?: string | null; quantity?: number; unitPrice?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertDraft(quotationId);

  let name = data.name?.trim() ?? "";
  let unitPrice = data.unitPrice;
  if (data.productId) {
    const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { name: true, price: true } });
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
    name = product.name;
    unitPrice = product.price;
  }
  if (!name) throw new Error("NAME_REQUIRED");

  return prisma.quotationItem.create({
    data: {
      quotationId,
      productId: data.productId ?? null,
      name,
      reference: data.reference ?? null,
      manualImageUrl: data.productId ? null : (data.manualImageUrl ?? null),
      quantity: sanitizeSaleCalcNumber(data.quantity ?? 1, { min: 1, integer: true }),
      unitPrice: sanitizeSaleCalcNumber(unitPrice ?? 0),
    },
  });
}

export async function updateQuotationItem(
  id: string,
  data: { productId?: string | null; name?: string; reference?: string | null; manualImageUrl?: string | null; quantity?: number; unitPrice?: number },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.quotationItem.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  await assertDraft(existing.quotationId);

  let name = data.name;
  let unitPrice = data.unitPrice;
  let manualImageUrl = data.manualImageUrl;
  if (data.productId !== undefined) {
    if (data.productId) {
      const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { name: true, price: true } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      name = product.name;
      unitPrice = product.price;
      manualImageUrl = null;
    }
  }

  return prisma.quotationItem.update({
    where: { id },
    data: {
      ...(data.productId !== undefined ? { productId: data.productId } : {}),
      ...(name !== undefined ? { name: name.trim() || existing.name } : {}),
      ...(data.reference !== undefined ? { reference: data.reference } : {}),
      ...((data.productId === undefined ? !existing.productId : !data.productId) && manualImageUrl !== undefined ? { manualImageUrl } : {}),
      ...(data.quantity !== undefined ? { quantity: sanitizeSaleCalcNumber(data.quantity, { min: 1, integer: true }) } : {}),
      ...(unitPrice !== undefined ? { unitPrice: sanitizeSaleCalcNumber(unitPrice) } : {}),
    },
  });
}

export async function deleteQuotationItem(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.quotationItem.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  await assertDraft(existing.quotationId);
  await prisma.quotationItem.delete({ where: { id } });
}

export async function sendQuotation(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const q = await prisma.quotation.findUnique({ where: { id }, include: { items: true } });
  if (!q) throw new Error("NOT_FOUND");
  if (q.status !== "DRAFT") throw new Error("INVALID_TRANSITION");
  if (q.items.length === 0) throw new Error("NO_ITEMS");
  return prisma.quotation.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
}

export async function approveQuotation(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const q = await resolveExpiry(await requireQuotation(id));
  if (q.status !== "SENT") throw new Error("INVALID_TRANSITION");
  return prisma.quotation.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
}

export async function rejectQuotation(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const q = await resolveExpiry(await requireQuotation(id));
  if (q.status !== "SENT") throw new Error("INVALID_TRANSITION");
  return prisma.quotation.update({ where: { id }, data: { status: "REJECTED", rejectedAt: new Date() } });
}

async function requireQuotation(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const q = await prisma.quotation.findUnique({ where: { id } });
  if (!q) throw new Error("NOT_FOUND");
  return q;
}

export async function convertQuotationToOrder(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { include: { product: { select: { image: true } } } }, client: true },
  });
  if (!quotation) throw new Error("NOT_FOUND");
  if (quotation.status !== "APPROVED") throw new Error("INVALID_TRANSITION");
  if (quotation.convertedOrderId) throw new Error("ALREADY_CONVERTED");

  const subtotal = calcLineTotalSum(quotation.items);
  const totalItems = quotation.items.reduce((sum, i) => sum + i.quantity, 0);

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: quotation.clientId,
        customerName: quotation.client.fullName,
        customerEmail: quotation.client.email,
        customerPhone: quotation.client.phone ?? "",
        company: quotation.client.company,
        department: quotation.client.department ?? "",
        city: quotation.client.city ?? "",
        addressLine1: quotation.client.addressLine1 ?? "",
        addressLine2: quotation.client.addressLine2,
        subtotal,
        totalItems,
        assignedSellerId: quotation.sellerId,
        items: {
          create: quotation.items.map((i) => ({
            productId: i.productId ?? "",
            name: i.name,
            image: resolveQuotationItemImage(i),
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            lineTotal: calcLineTotal(toQuotationLineInput(i)),
          })),
        },
      },
    });
    await tx.quotation.update({ where: { id }, data: { convertedOrderId: order.id } });
    return order;
  });
}

function calcLineTotalSum(items: { quantity: number; unitPrice: number }[]): number {
  return items.reduce((sum, i) => sum + calcLineTotal(toQuotationLineInput(i)), 0);
}

// ─── Producción ──────────────────────────────────────────────────

function toProductionRunInput(run: { produced: number; damaged: number; nonConforming: number }): ProductionRunInput {
  return { produced: run.produced, damaged: run.damaged, nonConforming: run.nonConforming };
}

export async function getMachines(includeInactive = false) {
  if (!prisma) return [];
  return prisma.machine.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function createMachine(data: { code: number; name: string; brand: string; model?: string; location?: string }) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.machine.create({
    data: {
      code: data.code,
      name: data.name.trim(),
      brand: data.brand.trim(),
      model: data.model?.trim() || null,
      location: data.location?.trim() || null,
    },
  });
}

export async function updateMachine(
  id: string,
  data: { code?: number; name?: string; brand?: string; model?: string | null; location?: string | null; isActive?: boolean },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.machine.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.brand !== undefined ? { brand: data.brand.trim() } : {}),
      ...(data.model !== undefined ? { model: data.model?.trim() || null } : {}),
      ...(data.location !== undefined ? { location: data.location?.trim() || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

export async function deleteMachine(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.machine.delete({ where: { id } });
}

export async function getProductionRuns(filters?: { machineId?: string; operatorId?: string; from?: Date; to?: Date }) {
  if (!prisma) return [];
  const runs = await prisma.productionRun.findMany({
    where: {
      ...(filters?.machineId ? { machineId: filters.machineId } : {}),
      ...(filters?.operatorId ? { operatorId: filters.operatorId } : {}),
      ...(filters?.from || filters?.to
        ? { productionDate: { ...(filters?.from ? { gte: filters.from } : {}), ...(filters?.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    include: {
      machine: { select: { id: true, name: true, brand: true, code: true } },
      operator: { select: { id: true, fullName: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: [{ productionDate: "desc" }, { startTime: "desc" }],
  });
  return runs.map((r) => ({ ...r, summary: buildProductionSummary(toProductionRunInput(r)) }));
}

export async function getProductionRunById(id: string) {
  if (!prisma) return null;
  const run = await prisma.productionRun.findUnique({
    where: { id },
    include: {
      machine: { select: { id: true, name: true, brand: true, code: true } },
      operator: { select: { id: true, fullName: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  });
  if (!run) return null;
  return { ...run, summary: buildProductionSummary(toProductionRunInput(run)) };
}

export type ProductionRunWriteData = {
  machineId: string;
  operatorId: string;
  productId?: string | null;
  productionOrderId?: string | null;
  orderNumber: string;
  productionDate: Date;
  startTime: Date;
  endTime: Date;
  material: string;
  pigment?: string | null;
  injectionWeight: number;
  pieceWeight: number;
  cycle: number;
  temperature: number;
  produced: number;
  damaged?: number;
  nonConforming?: number;
  couplingTest?: string | null;
  observations?: string | null;
};

function assertProductionQuantities(produced: number, damaged: number, nonConforming: number) {
  if (damaged > produced) throw new Error("DAMAGED_EXCEEDS_PRODUCED");
  if (nonConforming > produced) throw new Error("NON_CONFORMING_EXCEEDS_PRODUCED");
}

export async function createProductionRun(data: ProductionRunWriteData) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  assertProductionQuantities(data.produced, data.damaged ?? 0, data.nonConforming ?? 0);
  return prisma.productionRun.create({
    data: {
      machineId: data.machineId,
      operatorId: data.operatorId,
      productId: data.productId ?? null,
      productionOrderId: data.productionOrderId ?? null,
      orderNumber: data.orderNumber.trim(),
      productionDate: data.productionDate,
      startTime: data.startTime,
      endTime: data.endTime,
      material: data.material.trim(),
      pigment: data.pigment?.trim() || null,
      injectionWeight: sanitizeProductionNumber(data.injectionWeight, { min: 0 }),
      pieceWeight: sanitizeProductionNumber(data.pieceWeight, { min: 0 }),
      cycle: sanitizeProductionNumber(data.cycle, { min: 0 }),
      temperature: sanitizeProductionNumber(data.temperature, { min: 0 }),
      produced: sanitizeProductionNumber(data.produced, { min: 0, integer: true }),
      damaged: sanitizeProductionNumber(data.damaged ?? 0, { min: 0, integer: true }),
      nonConforming: sanitizeProductionNumber(data.nonConforming ?? 0, { min: 0, integer: true }),
      couplingTest: data.couplingTest?.trim() || null,
      observations: data.observations?.trim() || null,
    },
  });
}

export async function updateProductionRun(id: string, data: Partial<ProductionRunWriteData>) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (data.produced !== undefined || data.damaged !== undefined || data.nonConforming !== undefined) {
    const existing = await prisma.productionRun.findUnique({ where: { id } });
    if (!existing) throw new Error("NOT_FOUND");
    assertProductionQuantities(
      data.produced ?? existing.produced,
      data.damaged ?? existing.damaged,
      data.nonConforming ?? existing.nonConforming,
    );
  }
  return prisma.productionRun.update({
    where: { id },
    data: {
      ...(data.machineId !== undefined ? { machineId: data.machineId } : {}),
      ...(data.operatorId !== undefined ? { operatorId: data.operatorId } : {}),
      ...(data.productId !== undefined ? { productId: data.productId } : {}),
      ...(data.productionOrderId !== undefined ? { productionOrderId: data.productionOrderId } : {}),
      ...(data.orderNumber !== undefined ? { orderNumber: data.orderNumber.trim() } : {}),
      ...(data.productionDate !== undefined ? { productionDate: data.productionDate } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime } : {}),
      ...(data.material !== undefined ? { material: data.material.trim() } : {}),
      ...(data.pigment !== undefined ? { pigment: data.pigment?.trim() || null } : {}),
      ...(data.injectionWeight !== undefined ? { injectionWeight: sanitizeProductionNumber(data.injectionWeight, { min: 0 }) } : {}),
      ...(data.pieceWeight !== undefined ? { pieceWeight: sanitizeProductionNumber(data.pieceWeight, { min: 0 }) } : {}),
      ...(data.cycle !== undefined ? { cycle: sanitizeProductionNumber(data.cycle, { min: 0 }) } : {}),
      ...(data.temperature !== undefined ? { temperature: sanitizeProductionNumber(data.temperature, { min: 0 }) } : {}),
      ...(data.produced !== undefined ? { produced: sanitizeProductionNumber(data.produced, { min: 0, integer: true }) } : {}),
      ...(data.damaged !== undefined ? { damaged: sanitizeProductionNumber(data.damaged, { min: 0, integer: true }) } : {}),
      ...(data.nonConforming !== undefined ? { nonConforming: sanitizeProductionNumber(data.nonConforming, { min: 0, integer: true }) } : {}),
      ...(data.couplingTest !== undefined ? { couplingTest: data.couplingTest?.trim() || null } : {}),
      ...(data.observations !== undefined ? { observations: data.observations?.trim() || null } : {}),
    },
  });
}

export async function deleteProductionRun(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.productionRun.delete({ where: { id } });
}

// ─── Órdenes de Producción ───────────────────────────────────────

export type ProductionOrderSummary = {
  totalReferences: number;
  totalUnits: number;
  status: string;
};

function buildProductionOrderSummary(items: { quantity: number }[], status: string): ProductionOrderSummary {
  return {
    totalReferences: items.length,
    totalUnits: items.reduce((sum, i) => sum + i.quantity, 0),
    status,
  };
}

type ProductionOrderTx = Parameters<Parameters<NonNullable<typeof prisma>["$transaction"]>[0]>[0];

async function generateProductionOrderNumber(tx: ProductionOrderTx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OP-${year}-`;
  const count = await tx.productionOrder.count({ where: { number: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, "0")}`;
}

export async function getProductionOrders(filters?: { status?: string }) {
  if (!prisma) return [];
  const orders = await prisma.productionOrder.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    include: { items: true, createdBy: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => ({
    id: o.id,
    number: o.number,
    status: o.status,
    productionDate: o.productionDate.toISOString(),
    createdByName: o.createdBy.fullName,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    summary: buildProductionOrderSummary(o.items, o.status),
  }));
}

export async function getProductionOrderWithItems(id: string) {
  if (!prisma) return null;
  const order = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, name: true, sku: true, image: true } } }, orderBy: { order: "asc" } },
      createdBy: { select: { id: true, fullName: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });
  if (!order) return null;

  return {
    id: order.id,
    number: order.number,
    status: order.status,
    productionDate: order.productionDate.toISOString(),
    notes: order.notes,
    createdById: order.createdById,
    createdBy: order.createdBy,
    approvedById: order.approvedById,
    approvedBy: order.approvedBy,
    approvedAt: order.approvedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      product: i.product,
      quantity: i.quantity,
      destination: i.destination,
      notes: i.notes,
      order: i.order,
    })),
    summary: buildProductionOrderSummary(order.items, order.status),
  };
}

export async function createProductionOrder(data: { createdById: string; productionDate: Date; notes?: string | null }) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.$transaction(async (tx) => {
    const number = await generateProductionOrderNumber(tx);
    return tx.productionOrder.create({
      data: {
        number,
        createdById: data.createdById,
        productionDate: data.productionDate,
        notes: data.notes ?? null,
      },
    });
  });
}

async function assertProductionOrderDraft(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const o = await prisma.productionOrder.findUnique({ where: { id } });
  if (!o) throw new Error("NOT_FOUND");
  if (o.status !== "DRAFT") throw new Error("NOT_EDITABLE");
  return o;
}

export async function updateProductionOrder(
  id: string,
  data: { productionDate?: Date; notes?: string | null },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertProductionOrderDraft(id);
  return prisma.productionOrder.update({
    where: { id },
    data: {
      ...(data.productionDate !== undefined ? { productionDate: data.productionDate } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
}

export async function deleteProductionOrder(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertProductionOrderDraft(id);
  await prisma.productionOrder.delete({ where: { id } });
}

export async function createProductionOrderItem(
  productionOrderId: string,
  data: { productId: string; quantity?: number; destination?: string | null; notes?: string | null },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await assertProductionOrderDraft(productionOrderId);

  const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } });
  if (!product) throw new Error("PRODUCT_NOT_FOUND");

  return prisma.productionOrderItem.create({
    data: {
      productionOrderId,
      productId: data.productId,
      quantity: sanitizeProductionNumber(data.quantity ?? 1, { min: 1, integer: true }),
      destination: data.destination?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });
}

export async function updateProductionOrderItem(
  id: string,
  data: { productId?: string; quantity?: number; destination?: string | null; notes?: string | null },
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.productionOrderItem.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  await assertProductionOrderDraft(existing.productionOrderId);

  if (data.productId !== undefined) {
    const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } });
    if (!product) throw new Error("PRODUCT_NOT_FOUND");
  }

  return prisma.productionOrderItem.update({
    where: { id },
    data: {
      ...(data.productId !== undefined ? { productId: data.productId } : {}),
      ...(data.quantity !== undefined ? { quantity: sanitizeProductionNumber(data.quantity, { min: 1, integer: true }) } : {}),
      ...(data.destination !== undefined ? { destination: data.destination?.trim() || null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
    },
  });
}

export async function deleteProductionOrderItem(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const existing = await prisma.productionOrderItem.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  await assertProductionOrderDraft(existing.productionOrderId);
  await prisma.productionOrderItem.delete({ where: { id } });
}

export async function approveProductionOrder(id: string, approvedById: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const order = await prisma.productionOrder.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new Error("NOT_FOUND");
  if (order.status !== "DRAFT") throw new Error("INVALID_TRANSITION");
  if (order.items.length === 0) throw new Error("NO_ITEMS");
  return prisma.productionOrder.update({
    where: { id },
    data: { status: "APPROVED", approvedById, approvedAt: new Date() },
  });
}

export async function startProductionOrder(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const order = await prisma.productionOrder.findUnique({ where: { id } });
  if (!order) throw new Error("NOT_FOUND");
  if (order.status !== "APPROVED") throw new Error("INVALID_TRANSITION");
  return prisma.productionOrder.update({ where: { id }, data: { status: "IN_PRODUCTION" } });
}

export async function completeProductionOrder(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const order = await prisma.productionOrder.findUnique({ where: { id } });
  if (!order) throw new Error("NOT_FOUND");
  if (order.status !== "IN_PRODUCTION") throw new Error("INVALID_TRANSITION");
  return prisma.productionOrder.update({ where: { id }, data: { status: "COMPLETED" } });
}

export async function cancelProductionOrder(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const order = await prisma.productionOrder.findUnique({ where: { id } });
  if (!order) throw new Error("NOT_FOUND");
  if (order.status !== "DRAFT" && order.status !== "APPROVED") throw new Error("INVALID_TRANSITION");
  return prisma.productionOrder.update({ where: { id }, data: { status: "CANCELLED" } });
}

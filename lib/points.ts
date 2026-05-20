import { prisma } from "@/lib/prisma";
import type { CustomerLevel, PointTransactionType } from "@/generated/prisma/client";

// ─────────────────────────────────────────────
// LEGACY: sistema de puntos anterior (mantener para compatibilidad)
// ─────────────────────────────────────────────
export const LEVELS = [
  {
    key: "AQUA" as CustomerLevel,
    label: "Glow",
    min: 0,
    max: 499,
    color: "#27B1B8",
    bg: "#e8f9fa",
    description: "Bienvenido al programa Kliniu Points",
    perks: ["5% de descuento en tu próxima compra", "Acceso a ofertas exclusivas"],
  },
  {
    key: "CORAL" as CustomerLevel,
    label: "Pulse",
    min: 500,
    max: 1999,
    color: "#F07C5A",
    bg: "#fdf1ec",
    description: "Estás avanzando en tu fidelización",
    perks: ["8% de descuento", "Envío prioritario", "Acceso anticipado a nuevos productos"],
  },
  {
    key: "OCEAN" as CustomerLevel,
    label: "Nova",
    min: 2000,
    max: 4999,
    color: "#3A7BD5",
    bg: "#eef3fd",
    description: "Cliente destacado Kliniu",
    perks: ["12% de descuento", "Asesoría personalizada", "Recompensas exclusivas Nova"],
  },
  {
    key: "DIAMOND_SEAL" as CustomerLevel,
    label: "Elite",
    min: 5000,
    max: Infinity,
    color: "#8B5CF6",
    bg: "#f3f0fd",
    description: "El nivel más exclusivo de Kliniu",
    perks: ["15% de descuento permanente", "Gerente de cuenta dedicado", "Premios especiales Elite"],
  },
] as const;

export function getLevelForPoints(points: number) {
  return LEVELS.find((l) => points >= l.min && points <= l.max) ?? LEVELS[0];
}

export function getNextLevel(currentLevel: CustomerLevel) {
  const idx = LEVELS.findIndex((l) => l.key === currentLevel);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export function getLevelProgress(points: number, level: CustomerLevel) {
  const current = LEVELS.find((l) => l.key === level)!;
  const next = getNextLevel(level);
  if (!next) return 100;
  const range = next.min - current.min;
  const earned = points - current.min;
  return Math.min(100, Math.round((earned / range) * 100));
}

export async function getPointsForUser(userId: string) {
  if (!prisma) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true, level: true },
  });
  return user;
}

export async function getTransactionsForUser(userId: string, limit = 20) {
  if (!prisma) return [];
  return prisma.pointTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function addPoints(
  userId: string,
  points: number,
  type: PointTransactionType,
  description: string,
  orderId?: string,
) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
  if (!user) throw new Error("USER_NOT_FOUND");
  const newBalance = Math.max(0, user.points + points);
  const newLevel = getLevelForPoints(newBalance).key;
  const [, transaction] = await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: newBalance, level: newLevel } }),
    prisma.pointTransaction.create({
      data: { userId, type, points, balance: newBalance, description, orderId: orderId ?? null },
    }),
  ]);
  return { newBalance, newLevel, transaction };
}

export async function earnPointsForOrder(userId: string, orderTotal: number, orderId: string) {
  const points = Math.floor(orderTotal / 1000);
  if (points <= 0) return null;
  return addPoints(userId, points, "EARNED", `Compra #${orderId.slice(-6).toUpperCase()}`, orderId);
}

export async function getActiveRewards() {
  if (!prisma) return [];
  return prisma.reward.findMany({ where: { active: true }, orderBy: { pointsCost: "asc" } });
}

export async function redeemReward(userId: string, rewardId: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const [user, reward] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
    prisma.reward.findUnique({ where: { id: rewardId } }),
  ]);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (!reward || !reward.active) throw new Error("REWARD_NOT_FOUND");
  if (user.points < reward.pointsCost) throw new Error("INSUFFICIENT_POINTS");
  if (reward.stock !== null && reward.stock <= 0) throw new Error("REWARD_OUT_OF_STOCK");
  const newBalance = user.points - reward.pointsCost;
  const newLevel = getLevelForPoints(newBalance).key;
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { points: newBalance, level: newLevel } }),
    prisma.pointTransaction.create({
      data: { userId, type: "REDEEMED", points: -reward.pointsCost, balance: newBalance, description: `Canje: ${reward.name}` },
    }),
    prisma.rewardRedemption.create({ data: { userId, rewardId, points: reward.pointsCost } }),
    ...(reward.stock !== null ? [prisma.reward.update({ where: { id: rewardId }, data: { stock: { decrement: 1 } } })] : []),
  ]);
  return { newBalance, newLevel };
}

// ─────────────────────────────────────────────
// PUNTOS K: nuevo sistema por gasto mensual
// ─────────────────────────────────────────────

export const TIERS_K = [
  {
    key: "SILVER",
    label: "Silver",
    min: 2_000_000,
    max: 3_999_999,
    bonusPercent: 2,
    color: "#B8822A",
    colorBg: "#FDF6ED",
    colorBorder: "#E8C080",
    icon: "🥈",
  },
  {
    key: "GOLD",
    label: "Gold",
    min: 4_000_000,
    max: 5_999_999,
    bonusPercent: 4,
    color: "#C8A820",
    colorBg: "#FDFAEC",
    colorBorder: "#E8D870",
    icon: "🥇",
  },
  {
    key: "PLATINUM",
    label: "Platinum",
    min: 6_000_000,
    max: 7_999_999,
    bonusPercent: 6,
    color: "#4DAAAA",
    colorBg: "#EAF7F5",
    colorBorder: "#80CCCC",
    icon: "💎",
  },
  {
    key: "DIAMANTE",
    label: "Diamante",
    min: 10_000_000,
    max: Infinity,
    bonusPercent: 10,
    color: "#5588BB",
    colorBg: "#EEF3F8",
    colorBorder: "#88AACF",
    icon: "👑",
  },
] as const;

export type KTier = (typeof TIERS_K)[number]["key"] | "NONE";

export function getKTierForSpend(spend: number): KTier {
  if (spend >= 10_000_000) return "DIAMANTE";
  if (spend >= 6_000_000) return "PLATINUM";
  if (spend >= 4_000_000) return "GOLD";
  if (spend >= 2_000_000) return "SILVER";
  return "NONE";
}

export function getKTierData(tier: KTier) {
  if (tier === "NONE") return null;
  return TIERS_K.find((t) => t.key === tier) ?? null;
}

export function getKBonusPercent(tier: KTier): number {
  if (tier === "NONE") return 0;
  return TIERS_K.find((t) => t.key === tier)?.bonusPercent ?? 0;
}

export function getKNextTier(tier: KTier): (typeof TIERS_K)[number] | null {
  if (tier === "NONE") return TIERS_K[0];
  const idx = TIERS_K.findIndex((t) => t.key === tier);
  return idx < TIERS_K.length - 1 ? TIERS_K[idx + 1] : null;
}

export function getCurrentMonthPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getNextMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
}

export async function getMonthlySpendForUser(
  userId: string,
  year?: number,
  month?: number,
): Promise<number> {
  if (!prisma) return 0;
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month !== undefined ? month : now.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  const orders = await prisma.order.findMany({
    where: { userId, createdAt: { gte: start, lte: end }, status: { not: "CANCELLED" } },
    select: { subtotal: true },
  });
  return orders.reduce((sum, o) => sum + o.subtotal, 0);
}

export async function getUserKData(userId: string) {
  if (!prisma) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kTier: true, bonusBalance: true, bonusExpiry: true, monthlyPeriod: true },
  });
  if (!user) return null;

  const monthlySpend = await getMonthlySpendForUser(userId);
  const currentTier = getKTierForSpend(monthlySpend);

  const bonusIsValid = user.bonusExpiry ? new Date() < new Date(user.bonusExpiry) : false;
  const bonusBalance = bonusIsValid ? user.bonusBalance : 0;

  // Minimum purchase required to redeem bonus (25% of last month's total)
  // We use bonusBalance / bonusPercent * 100 * 0.25 as estimate
  const storedTier = user.kTier as KTier;
  const storedBonusPercent = getKBonusPercent(storedTier);
  const estimatedLastMonthSpend =
    storedBonusPercent > 0 ? Math.round((bonusBalance / storedBonusPercent) * 100) : 0;
  const minPurchaseToRedeem = Math.round(estimatedLastMonthSpend * 0.25);

  return {
    monthlySpend,
    currentTier,
    bonusBalance,
    bonusExpiry: bonusIsValid ? user.bonusExpiry : null,
    storedTier: storedTier,
    minPurchaseToRedeem,
    currentMonthPeriod: getCurrentMonthPeriod(),
  };
}

export async function issueMonthlyBonus(userId: string): Promise<{ bonusAmount: number; tier: KTier }> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const spend = await getMonthlySpendForUser(userId, prevYear, prevMonth);
  const tier = getKTierForSpend(spend);
  const bonusPercent = getKBonusPercent(tier);
  const bonusAmount = Math.round(spend * bonusPercent / 100);

  if (bonusAmount > 0) {
    const expiry = getNextMonthEnd();
    await prisma.user.update({
      where: { id: userId },
      data: {
        kTier: tier,
        bonusBalance: bonusAmount,
        bonusExpiry: expiry,
        monthlyPeriod: getCurrentMonthPeriod(),
      },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { kTier: "NONE", bonusBalance: 0, bonusExpiry: null, monthlyPeriod: getCurrentMonthPeriod() },
    });
  }

  return { bonusAmount, tier };
}

export async function redeemBonus(userId: string, currentPurchaseAmount: number): Promise<number> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const data = await getUserKData(userId);
  if (!data) throw new Error("USER_NOT_FOUND");
  if (data.bonusBalance <= 0) throw new Error("NO_BONUS_AVAILABLE");
  if (currentPurchaseAmount < data.minPurchaseToRedeem) throw new Error("MIN_PURCHASE_NOT_MET");

  const bonusToApply = data.bonusBalance;
  await prisma.user.update({
    where: { id: userId },
    data: { bonusBalance: 0, bonusExpiry: null },
  });

  return bonusToApply;
}

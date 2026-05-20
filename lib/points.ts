import { prisma } from "@/lib/prisma";
import type { CustomerLevel, PointTransactionType } from "@/generated/prisma/client";

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
    prisma.user.update({
      where: { id: userId },
      data: { points: newBalance, level: newLevel },
    }),
    prisma.pointTransaction.create({
      data: {
        userId,
        type,
        points,
        balance: newBalance,
        description,
        orderId: orderId ?? null,
      },
    }),
  ]);

  return { newBalance, newLevel, transaction };
}

export async function earnPointsForOrder(userId: string, orderTotal: number, orderId: string) {
  // 1 punto por cada 1000 COP
  const points = Math.floor(orderTotal / 1000);
  if (points <= 0) return null;
  return addPoints(userId, points, "EARNED", `Compra #${orderId.slice(-6).toUpperCase()}`, orderId);
}

export async function getActiveRewards() {
  if (!prisma) return [];
  return prisma.reward.findMany({
    where: { active: true },
    orderBy: { pointsCost: "asc" },
  });
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
    prisma.user.update({
      where: { id: userId },
      data: { points: newBalance, level: newLevel },
    }),
    prisma.pointTransaction.create({
      data: {
        userId,
        type: "REDEEMED",
        points: -reward.pointsCost,
        balance: newBalance,
        description: `Canje: ${reward.name}`,
      },
    }),
    prisma.rewardRedemption.create({
      data: { userId, rewardId, points: reward.pointsCost },
    }),
    ...(reward.stock !== null
      ? [prisma.reward.update({ where: { id: rewardId }, data: { stock: { decrement: 1 } } })]
      : []),
  ]);

  return { newBalance, newLevel };
}

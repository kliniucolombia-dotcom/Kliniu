import { prisma } from "@/lib/prisma";
import type { Prisma, Warehouse } from "@/generated/prisma/client";

export const WAREHOUSE_KEYS = {
  MATERIA_PRIMA_MOLDES: "MATERIA_PRIMA_MOLDES",
  PIEZAS_IMPORTADAS: "PIEZAS_IMPORTADAS",
  PRODUCTO_TERMINADO: "PRODUCTO_TERMINADO",
} as const;

export type WarehouseKey = (typeof WAREHOUSE_KEYS)[keyof typeof WAREHOUSE_KEYS];

const SYSTEM_USER_EMAIL = "system@kliniu.internal";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const db = requirePrisma();
  return db.warehouse.findMany({ orderBy: { order: "asc" } });
}

export async function getWarehouseByKey(key: WarehouseKey): Promise<Warehouse> {
  const db = requirePrisma();
  const warehouse = await db.warehouse.findUnique({ where: { key } });
  if (!warehouse) {
    throw new Error(`WAREHOUSE_NOT_FOUND:${key}`);
  }
  return warehouse;
}

let cachedSystemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedSystemUserId) return cachedSystemUserId;

  const db = requirePrisma();
  const user = await db.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (!user) {
    throw new Error(
      "SYSTEM_USER_NOT_FOUND: corre scripts/seed-warehouses.ts antes de usar el módulo de bodegas",
    );
  }
  cachedSystemUserId = user.id;
  return user.id;
}

function computeAvailability(stock: number, minimumStock: number): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minimumStock) return "Disponible por pedido";
  return "Entrega inmediata";
}

export async function recalculateProductStock(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<number> {
  const [{ _sum }, product] = await Promise.all([
    tx.productWarehouseStock.aggregate({
      where: { productId },
      _sum: { quantity: true },
    }),
    tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { minimumStock: true },
    }),
  ]);

  const total = _sum.quantity ?? 0;

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: total,
      availability: computeAvailability(total, product.minimumStock),
    },
  });

  return total;
}

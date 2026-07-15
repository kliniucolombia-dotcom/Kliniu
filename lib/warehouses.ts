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

async function upsertStockRow(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
  nextQuantity: number,
) {
  await tx.productWarehouseStock.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantity: nextQuantity },
    create: { productId, warehouseId, quantity: nextQuantity },
  });
}

async function currentQuantity(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
): Promise<number> {
  const row = await tx.productWarehouseStock.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });
  return row?.quantity ?? 0;
}

export async function setWarehouseStockAbsolute(input: {
  productId: string;
  warehouseKey: WarehouseKey;
  quantity: number;
  source: "USER" | "ODOO" | "SYSTEM";
  userId?: string;
  note?: string;
}): Promise<number> {
  const db = requirePrisma();
  const warehouse = await getWarehouseByKey(input.warehouseKey);
  const nextQuantity = Math.max(0, Math.round(input.quantity));
  const userId = input.userId ?? (await getSystemUserId());

  return db.$transaction(async (tx) => {
    const current = await currentQuantity(tx, input.productId, warehouse.id);
    const delta = nextQuantity - current;

    if (delta !== 0) {
      await tx.warehouseMovement.create({
        data: {
          productId: input.productId,
          type: delta > 0 ? "ENTRADA" : "SALIDA",
          source: input.source,
          quantity: Math.abs(delta),
          fromWarehouseId: delta > 0 ? null : warehouse.id,
          toWarehouseId: delta > 0 ? warehouse.id : null,
          note: input.note,
          userId,
        },
      });
      await upsertStockRow(tx, input.productId, warehouse.id, nextQuantity);
    }

    return recalculateProductStock(tx, input.productId);
  });
}

export async function adjustWarehouseStock(input: {
  productId: string;
  warehouseId: string;
  type: "ENTRADA" | "SALIDA";
  quantity: number;
  userId: string;
  note?: string;
}): Promise<number> {
  const db = requirePrisma();
  const quantity = Math.round(input.quantity);
  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  return db.$transaction(async (tx) => {
    const current = await currentQuantity(tx, input.productId, input.warehouseId);
    const nextQuantity = input.type === "ENTRADA" ? current + quantity : current - quantity;

    if (nextQuantity < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await tx.warehouseMovement.create({
      data: {
        productId: input.productId,
        type: input.type,
        source: "USER",
        quantity,
        fromWarehouseId: input.type === "SALIDA" ? input.warehouseId : null,
        toWarehouseId: input.type === "ENTRADA" ? input.warehouseId : null,
        note: input.note,
        userId: input.userId,
      },
    });
    await upsertStockRow(tx, input.productId, input.warehouseId, nextQuantity);

    return recalculateProductStock(tx, input.productId);
  });
}

export async function transferWarehouseStock(input: {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  userId: string;
  note?: string;
}): Promise<number> {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error("SAME_WAREHOUSE");
  }

  const db = requirePrisma();
  const quantity = Math.round(input.quantity);
  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  return db.$transaction(async (tx) => {
    const fromCurrent = await currentQuantity(tx, input.productId, input.fromWarehouseId);
    const nextFrom = fromCurrent - quantity;
    if (nextFrom < 0) throw new Error("INSUFFICIENT_STOCK");

    const toCurrent = await currentQuantity(tx, input.productId, input.toWarehouseId);

    await tx.warehouseMovement.create({
      data: {
        productId: input.productId,
        type: "TRANSFERENCIA",
        source: "USER",
        quantity,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        note: input.note,
        userId: input.userId,
      },
    });
    await upsertStockRow(tx, input.productId, input.fromWarehouseId, nextFrom);
    await upsertStockRow(tx, input.productId, input.toWarehouseId, toCurrent + quantity);

    return recalculateProductStock(tx, input.productId);
  });
}

export type ProductWithWarehouseStocks = {
  id: string;
  name: string;
  sku: string | null;
  minimumStock: number;
  stock: number;
  stocksByWarehouseId: Record<string, number>;
};

export async function listProductsWithWarehouseStock(): Promise<ProductWithWarehouseStocks[]> {
  const db = requirePrisma();
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      sku: true,
      minimumStock: true,
      stock: true,
      warehouseStocks: { select: { warehouseId: true, quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    minimumStock: p.minimumStock,
    stock: p.stock,
    stocksByWarehouseId: Object.fromEntries(
      p.warehouseStocks.map((s) => [s.warehouseId, s.quantity]),
    ),
  }));
}

export async function getWarehouseMovements(productId: string, limit = 20) {
  const db = requirePrisma();
  return db.warehouseMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { fromWarehouse: true, toWarehouse: true },
  });
}

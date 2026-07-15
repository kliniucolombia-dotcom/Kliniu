import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

loadEnv({ path: ".env.local" });
loadEnv();

const WAREHOUSES = [
  { key: "MATERIA_PRIMA_MOLDES", name: "Materia prima / moldes", order: 1 },
  { key: "PIEZAS_IMPORTADAS", name: "Piezas inyectadas / importadas", order: 2 },
  { key: "PRODUCTO_TERMINADO", name: "Producto terminado", order: 3 },
];

const SYSTEM_USER_EMAIL = "system@kliniu.internal";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const w of WAREHOUSES) {
    const warehouse = await prisma.warehouse.upsert({
      where: { key: w.key },
      update: { name: w.name, order: w.order },
      create: w,
    });
    console.log("Warehouse OK:", warehouse.key, warehouse.name);
  }

  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      fullName: "Sistema (bodegas/Odoo)",
      email: SYSTEM_USER_EMAIL,
      passwordHash: "SYSTEM_ACCOUNT_NO_LOGIN",
      role: "INGENIERIA",
      status: "INACTIVE",
    },
  });
  console.log("System user OK:", systemUser.email);

  const productoTerminado = await prisma.warehouse.findUniqueOrThrow({
    where: { key: "PRODUCTO_TERMINADO" },
  });

  const products = await prisma.product.findMany({
    select: { id: true, stock: true },
  });

  let migrated = 0;
  for (const product of products) {
    const existing = await prisma.productWarehouseStock.findUnique({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: productoTerminado.id,
        },
      },
    });
    if (existing) continue;

    await prisma.productWarehouseStock.create({
      data: {
        productId: product.id,
        warehouseId: productoTerminado.id,
        quantity: product.stock,
      },
    });
    await prisma.warehouseMovement.create({
      data: {
        productId: product.id,
        type: "ENTRADA",
        source: "SYSTEM",
        quantity: product.stock,
        toWarehouseId: productoTerminado.id,
        note: "Migración inicial de stock legado",
        userId: systemUser.id,
      },
    });
    migrated++;
  }
  console.log(`Migrated ${migrated} products into PRODUCTO_TERMINADO.`);

  await prisma.$disconnect();
}

main();

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import {
  descripcionProducto,
  productosCatalogo,
} from "../app/data/catalog";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run prisma db seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

async function main() {
  const adminPasswordHash = await hash("123456789", 10);
  const packingPasswordHash = await hash("empaque2024", 10);

  await prisma.user.upsert({
    where: {
      email: "kliniucolombia@gmail.com",
    },
    update: {
      fullName: "Kliniu1234",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
    create: {
      fullName: "Kliniu1234",
      email: "kliniucolombia@gmail.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "empaque@kliniu.co",
    },
    update: {
      fullName: "Empaque Kliniu",
      role: "PACKING",
      passwordHash: packingPasswordHash,
    },
    create: {
      fullName: "Empaque Kliniu",
      email: "empaque@kliniu.co",
      passwordHash: packingPasswordHash,
      role: "PACKING",
    },
  });

  // Solo sembrar productos si la BD está vacía — nunca borrar productos existentes
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    for (const [index, producto] of productosCatalogo.entries()) {
    const stock = producto.stock ?? 12;
    const stockMinimo = producto.stockMinimo ?? 3;

    await prisma.product.create({
      data: {
        slug: producto.slug,
        sku:
          producto.sku ||
          producto.slug.replace(/-/g, "").toUpperCase().slice(0, 10) ||
          `SKU${Date.now()}${index}`,
        category: producto.categoria,
        name: producto.nombre,
        brand: producto.marca,
        price: producto.precioValor,
        previousPrice: Math.max(
          producto.precioValor,
          Number(producto.precioAnterior.replace(/\D/g, "")) || producto.precioValor,
        ),
        stock,
        minimumStock: stockMinimo,
        image: producto.imagen,
        galleryImages: producto.imagenesExtra || [],
        availability: stock <= 0 ? "Agotado" : producto.disponibilidad,
        description:
          producto.descripcion ||
          descripcionProducto({
            nombre: producto.nombre,
            categoria: producto.categoria,
            marca: producto.marca,
          }),
        featured: index < 4,
        active: true,
        inventoryMovements: {
          create: {
            type: "CREATED",
            quantity: stock,
            stockAfter: stock,
            note: "Inventario inicial sembrado",
          },
        },
      },
    });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from "@/lib/prisma";

export type PersistedCartItem = {
  id: string;
  nombre: string;
  precio: string;
  precioOriginal?: string;
  imagen: string;
  cantidad: number;
  sku?: string;
};

export type PersistedComboItem = {
  comboId: string;
  cantidad?: number;
};

function mapCartItem(item: {
  productId: string | null;
  comboId: string | null;
  name: string;
  price: string;
  originalPrice: string | null;
  image: string;
  quantity: number;
  sku: string | null;
  combo?: { items: { quantity: number; product: { name: string } }[] } | null;
}) {
  return {
    id: (item.productId ?? item.comboId) as string,
    nombre: item.name,
    precio: item.price,
    precioOriginal: item.originalPrice ?? undefined,
    imagen: item.image,
    cantidad: item.quantity,
    sku: item.sku ?? undefined,
    isCombo: item.comboId != null,
    comboId: item.comboId ?? undefined,
    comboItems: item.combo?.items.map((i) => ({ nombre: i.product.name, cantidad: i.quantity })),
  };
}

export async function getCartItemsForUser(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { combo: { include: { items: { include: { product: { select: { name: true } } } } } } },
  });

  return items.map(mapCartItem);
}

export async function addCartItemForUser(
  userId: string,
  item: Omit<PersistedCartItem, "cantidad"> & { cantidad?: number },
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const quantityToAdd = Math.max(1, Math.trunc(item.cantidad ?? 1));

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId: item.id,
      },
    },
    update: {
      name: item.nombre,
      price: item.precio,
      originalPrice: item.precioOriginal ?? null,
      image: item.imagen,
      sku: item.sku ?? null,
      quantity: {
        increment: quantityToAdd,
      },
    },
    create: {
      userId,
      productId: item.id,
      name: item.nombre,
      price: item.precio,
      originalPrice: item.precioOriginal ?? null,
      image: item.imagen,
      sku: item.sku ?? null,
      quantity: quantityToAdd,
    },
  });

  return getCartItemsForUser(userId);
}

export async function addComboItemForUser(userId: string, comboId: string, cantidad = 1) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const combo = await prisma.combo.findUnique({ where: { id: comboId } });
  if (!combo || !combo.active) {
    throw new Error("COMBO_NOT_AVAILABLE");
  }

  const quantityToAdd = Math.max(1, Math.trunc(cantidad));

  await prisma.cartItem.upsert({
    where: {
      userId_comboId: {
        userId,
        comboId: combo.id,
      },
    },
    update: {
      name: combo.name,
      price: String(combo.price),
      image: combo.image ?? "",
      sku: combo.sku,
      quantity: {
        increment: quantityToAdd,
      },
    },
    create: {
      userId,
      comboId: combo.id,
      name: combo.name,
      price: String(combo.price),
      image: combo.image ?? "",
      sku: combo.sku,
      quantity: quantityToAdd,
    },
  });

  return getCartItemsForUser(userId);
}

export async function updateCartItemQuantityForUser(
  userId: string,
  itemId: string,
  action: "increment" | "decrement",
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const item = await prisma.cartItem.findFirst({
    where: { userId, OR: [{ productId: itemId }, { comboId: itemId }] },
  });

  if (!item) {
    return getCartItemsForUser(userId);
  }

  if (action === "decrement" && item.quantity <= 1) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: {
          [action === "increment" ? "increment" : "decrement"]: 1,
        },
      },
    });
  }

  return getCartItemsForUser(userId);
}

export async function removeCartItemForUser(userId: string, itemId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  await prisma.cartItem.deleteMany({
    where: { userId, OR: [{ productId: itemId }, { comboId: itemId }] },
  });

  return getCartItemsForUser(userId);
}

export async function clearCartForUser(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  await prisma.cartItem.deleteMany({
    where: { userId },
  });

  return [];
}

export async function syncCartItemsForUser(
  userId: string,
  items: PersistedCartItem[],
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  for (const item of items) {
    await prisma.cartItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId: item.id,
        },
      },
      update: {
        name: item.nombre,
        price: item.precio,
        originalPrice: item.precioOriginal ?? null,
        image: item.imagen,
        sku: item.sku ?? null,
        quantity: {
          increment: item.cantidad,
        },
      },
      create: {
        userId,
        productId: item.id,
        name: item.nombre,
        price: item.precio,
        originalPrice: item.precioOriginal ?? null,
        image: item.imagen,
        sku: item.sku ?? null,
        quantity: item.cantidad,
      },
    });
  }

  return getCartItemsForUser(userId);
}

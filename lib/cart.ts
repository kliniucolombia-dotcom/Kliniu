import { prisma } from "@/lib/prisma";

export type PersistedCartItem = {
  id: string;
  nombre: string;
  precio: string;
  imagen: string;
  cantidad: number;
};

export async function getCartItemsForUser(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return items.map((item) => ({
    id: item.productId,
    nombre: item.name,
    precio: item.price,
    imagen: item.image,
    cantidad: item.quantity,
  }));
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
      image: item.imagen,
      quantity: {
        increment: quantityToAdd,
      },
    },
    create: {
      userId,
      productId: item.id,
      name: item.nombre,
      price: item.precio,
      image: item.imagen,
      quantity: quantityToAdd,
    },
  });

  return getCartItemsForUser(userId);
}

export async function updateCartItemQuantityForUser(
  userId: string,
  productId: string,
  action: "increment" | "decrement",
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const item = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (!item) {
    return getCartItemsForUser(userId);
  }

  if (action === "decrement" && item.quantity <= 1) {
    await prisma.cartItem.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });
  } else {
    await prisma.cartItem.update({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      data: {
        quantity: {
          [action === "increment" ? "increment" : "decrement"]: 1,
        },
      },
    });
  }

  return getCartItemsForUser(userId);
}

export async function removeCartItemForUser(userId: string, productId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  await prisma.cartItem.deleteMany({
    where: {
      userId,
      productId,
    },
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
        image: item.imagen,
        quantity: {
          increment: item.cantidad,
        },
      },
      create: {
        userId,
        productId: item.id,
        name: item.nombre,
        price: item.precio,
        image: item.imagen,
        quantity: item.cantidad,
      },
    });
  }

  return getCartItemsForUser(userId);
}

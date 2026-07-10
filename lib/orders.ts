import { prisma } from "@/lib/prisma";
import { pushOrderToOdoo } from "@/lib/odoo";

export type CheckoutInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  notes?: string;
};

export type ShippingStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

function parsePriceValue(price: string) {
  const numeric = Number(price.replace(/[^\d]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

// El carrito guarda variantes de color/tipo como "slug--color--tipo" en
// CartItem.productId; el producto real solo existe con el slug base.
function baseProductSlug(productId: string) {
  return productId.split("--")[0];
}

export async function createOrderFromCart(userId: string, input: CheckoutInput) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const customerName = input.customerName.trim();
  const customerEmail = input.customerEmail.trim().toLowerCase();
  const customerPhone = input.customerPhone.trim();
  const company = input.company?.trim() || null;
  const department = input.department.trim();
  const city = input.city.trim();
  const addressLine1 = input.addressLine1.trim();
  const addressLine2 = input.addressLine2?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (
    !customerName ||
    !customerEmail ||
    !customerPhone ||
    !department ||
    !city ||
    !addressLine1
  ) {
    throw new Error("INVALID_CHECKOUT");
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (cartItems.length === 0) {
    throw new Error("EMPTY_CART");
  }

  const subtotal = cartItems.reduce(
    (total, item) => total + parsePriceValue(item.price) * item.quantity,
    0,
  );
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);

  const order = await prisma.$transaction(async (tx) => {
    const productCartItems = cartItems.filter((item) => item.productId);
    const comboCartItems = cartItems.filter((item) => item.comboId);

    const productSlugs = productCartItems.map((item) => baseProductSlug(item.productId as string));
    const products = await tx.product.findMany({
      where: {
        slug: {
          in: productSlugs,
        },
      },
      select: {
        id: true,
        slug: true,
        stock: true,
        minimumStock: true,
      },
    });

    // No bloqueamos por falta de stock: la empresa puede fabricar/conseguir
    // el producto sobre pedido aunque el inventario esté en 0.
    for (const item of productCartItems) {
      const product = products.find((entry) => entry.slug === baseProductSlug(item.productId as string));

      if (!product) {
        throw new Error(`PRODUCT_NOT_FOUND:${item.name}`);
      }
    }

    const comboIds = comboCartItems.map((item) => item.comboId as string);
    const combos = await tx.combo.findMany({
      where: { id: { in: comboIds } },
      include: { items: { include: { product: true } } },
    });

    const stockDeductions = new Map<
      string,
      { id: string; stock: number; minimumStock: number; needed: number }
    >();

    for (const item of productCartItems) {
      const product = products.find((entry) => entry.slug === baseProductSlug(item.productId as string));
      if (!product) continue;
      const tracked = stockDeductions.get(product.id) ?? {
        id: product.id,
        stock: product.stock,
        minimumStock: product.minimumStock,
        needed: 0,
      };
      tracked.needed += item.quantity;
      stockDeductions.set(product.id, tracked);
    }

    for (const cartCombo of comboCartItems) {
      const combo = combos.find((c) => c.id === cartCombo.comboId);
      if (!combo || !combo.active) {
        throw new Error(`INSUFFICIENT_STOCK:${cartCombo.name}`);
      }

      for (const comboItem of combo.items) {
        const neededQuantity = comboItem.quantity * cartCombo.quantity;
        const tracked = stockDeductions.get(comboItem.productId) ?? {
          id: comboItem.productId,
          stock: comboItem.product.stock,
          minimumStock: comboItem.product.minimumStock,
          needed: 0,
        };
        tracked.needed += neededQuantity;
        stockDeductions.set(comboItem.productId, tracked);
      }
    }

    // Round-robin: assign to the seller with fewest orders
    const sellers = await tx.user.findMany({
      where: { role: "SELLER" },
      select: { id: true, _count: { select: { assignedOrders: true } } },
      orderBy: { fullName: "asc" },
    });
    const assignedSellerId = sellers.length > 0
      ? sellers.sort((a, b) => a._count.assignedOrders - b._count.assignedOrders)[0].id
      : null;

    const createdOrder = await tx.order.create({
      data: {
        userId,
        customerName,
        customerEmail,
        customerPhone,
        company,
        department,
        city,
        addressLine1,
        addressLine2,
        notes,
        subtotal,
        totalItems,
        assignedSellerId,
        items: {
          create: cartItems.map((item) => {
            const unitPrice = parsePriceValue(item.price);
            const combo = item.comboId ? combos.find((c) => c.id === item.comboId) : null;

            return {
              productId: item.productId,
              comboId: item.comboId,
              comboSnapshot: combo
                ? {
                    name: combo.name,
                    sku: combo.sku,
                    price: combo.price,
                    items: combo.items.map((ci) => ({
                      productId: ci.productId,
                      name: ci.product.name,
                      quantity: ci.quantity,
                    })),
                  }
                : undefined,
              name: item.name,
              image: item.image,
              unitPrice,
              quantity: item.quantity,
              lineTotal: unitPrice * item.quantity,
              sku: item.sku,
            };
          }),
        },
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    for (const tracked of stockDeductions.values()) {
      const deductedQuantity = Math.min(tracked.stock, tracked.needed);
      const nextStock = Math.max(tracked.stock - tracked.needed, 0);

      await tx.product.update({
        where: { id: tracked.id },
        data: {
          stock: nextStock,
          availability:
            nextStock <= tracked.minimumStock
                ? "Disponible por pedido"
                : "Entrega inmediata",
          ...(deductedQuantity > 0
            ? {
                inventoryMovements: {
                  create: {
                    type: "ORDER_DEDUCTION",
                    quantity: -deductedQuantity,
                    stockAfter: nextStock,
                    note: `Descuento automático por pedido ${createdOrder.id}`,
                  },
                },
              }
            : {}),
        },
      });
    }

    await tx.cartItem.deleteMany({
      where: { userId },
    });

    return createdOrder;
  });

  return order;
}

export async function syncOrderToOdoo(orderId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.odooOrderId) {
    return order;
  }

  try {
    const result = await pushOrderToOdoo({
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      company: order.company,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      city: order.city,
      department: order.department,
      notes: order.notes,
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    return await prisma.order.update({
      where: { id: orderId },
      data: {
        odooOrderId: result.odooOrderId,
        odooOrderName: result.odooOrderName,
        odooSyncStatus: "SYNCED",
        odooSyncError: null,
        odooSyncedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ODOO_SYNC_ERROR";

    return await prisma.order.update({
      where: { id: orderId },
      data: {
        odooSyncStatus: "FAILED",
        odooSyncError: message,
      },
    });
  }
}

export async function getOrdersForUser(userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getAllOrders() {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateOrderShipping(
  orderId: string,
  input: {
    shippingStatus: ShippingStatus;
    paymentStatus?: "PENDING" | "PAID" | "FAILED";
    carrier?: string;
    trackingNumber?: string;
    adminNotes?: string;
  },
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const shippingStatus = input.shippingStatus;
  const paymentStatus = input.paymentStatus;
  const carrier = input.carrier?.trim() || null;
  const trackingNumber = input.trackingNumber?.trim() || null;
  const adminNotes = input.adminNotes?.trim() || null;

  if (!["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(shippingStatus)) {
    throw new Error("INVALID_SHIPPING_STATUS");
  }

  if (
    paymentStatus &&
    !["PENDING", "PAID", "FAILED"].includes(paymentStatus)
  ) {
    throw new Error("INVALID_PAYMENT_STATUS");
  }

  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
    },
  });

  if (!currentOrder) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const nextPaymentStatus = paymentStatus || currentOrder.paymentStatus;
  const nextOrderStatus =
    shippingStatus === "CANCELLED"
      ? "CANCELLED"
      : nextPaymentStatus === "PAID"
        ? "PAID"
        : "PENDING";

  const shippedAt =
    shippingStatus === "SHIPPED" || shippingStatus === "DELIVERED"
      ? new Date()
      : null;
  const deliveredAt = shippingStatus === "DELIVERED" ? new Date() : null;

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      shippingStatus,
      paymentStatus: nextPaymentStatus,
      status: nextOrderStatus,
      carrier,
      trackingNumber,
      adminNotes,
      shippedAt,
      deliveredAt,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (nextPaymentStatus === "PAID" && currentOrder.paymentStatus !== "PAID") {
    await syncOrderToOdoo(orderId);
  }

  return updated;
}

export async function confirmSimulatedOrderPayment(
  orderId: string,
  userId: string,
  paymentCode: string,
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const expectedPaymentCode =
    process.env.SIMULATED_PAYMENT_CODE?.trim() || "1234";

  if (paymentCode.trim() !== expectedPaymentCode) {
    throw new Error("INVALID_PAYMENT_CODE");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const paidOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      status: "PAID",
      shippingStatus:
        order.shippingStatus === "PENDING" ? "PREPARING" : order.shippingStatus,
      adminNotes:
        order.adminNotes ||
        "Pago demo confirmado con código interno de validación.",
    },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return await syncOrderToOdoo(orderId);
}

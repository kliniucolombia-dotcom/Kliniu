import { prisma } from "@/lib/prisma";

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
    const productSlugs = cartItems.map((item) => item.productId);
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

    for (const item of cartItems) {
      const product = products.find((entry) => entry.slug === item.productId);

      if (!product) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      if (product.stock > 0 && product.stock < item.quantity) {
        throw new Error("INSUFFICIENT_STOCK");
      }
    }

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
        items: {
          create: cartItems.map((item) => {
            const unitPrice = parsePriceValue(item.price);

            return {
              productId: item.productId,
              name: item.name,
              image: item.image,
              unitPrice,
              quantity: item.quantity,
              lineTotal: unitPrice * item.quantity,
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

    for (const item of cartItems) {
      const product = products.find((entry) => entry.slug === item.productId);

      if (!product) {
        continue;
      }

      const deductedQuantity = Math.min(product.stock, item.quantity);
      const nextStock = Math.max(product.stock - item.quantity, 0);

      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: nextStock,
          availability:
            nextStock <= product.minimumStock
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

  return await prisma.order.update({
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

  return await prisma.order.update({
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
}

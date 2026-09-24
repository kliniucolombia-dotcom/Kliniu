import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pushOrderToOdoo } from "@/lib/odoo";
import { getShippingForLocation, getShippingOverride } from "@/lib/shipping-rates";
import { earnPointsForOrder } from "@/lib/points";
import { DASHBOARD_STATS_TAG } from "@/lib/cache-tags";
import type { Prisma } from "@/generated/prisma/client";

// Ventana de pago del Web Checkout de Wompi: pasado este tiempo sin pago
// aprobado, el cron de expiración libera la reserva de stock. 60 min iguala
// el vencimiento por defecto del token de Wompi (confirmado en su doc de
// soporte) para no liberar la reserva mientras el link todavía es válido;
// además se sincroniza como "expiration-time" en el Web Checkout (lib/wompi.ts)
// para que el countdown visible en Wompi cierre exactamente al mismo tiempo.
const PAYMENT_WINDOW_MINUTES = 60;

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

function computeAvailability(stock: number, reservedStock: number, minimumStock: number) {
  return stock - reservedStock <= minimumStock ? "Disponible por pedido" : "Entrega inmediata";
}

type OrderStockItem = {
  productId: string | null;
  comboId: string | null;
  comboSnapshot: unknown;
  quantity: number;
};

type OrderStockNeed = {
  id: string;
  needed: number;
  stock: number;
  reservedStock: number;
  minimumStock: number;
};

// Expande los OrderItem (incluidos los combos, vía su comboSnapshot) a la
// cantidad real necesaria por producto base. Se usa tanto al confirmar el
// pago como al liberar una reserva, para no depender del carrito (que puede
// haber cambiado entre la creación del pedido y la confirmación del pago).
async function computeOrderStockNeeds(
  tx: Prisma.TransactionClient,
  items: OrderStockItem[],
): Promise<OrderStockNeed[]> {
  const directItems = items.filter((item) => item.productId && !item.comboId);
  const comboItems = items.filter((item) => item.comboId);

  const needed = new Map<string, number>();

  if (directItems.length > 0) {
    const slugs = directItems.map((item) => baseProductSlug(item.productId as string));
    const productsBySlug = await tx.product.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });

    for (const item of directItems) {
      const product = productsBySlug.find((p) => p.slug === baseProductSlug(item.productId as string));
      if (!product) continue;
      needed.set(product.id, (needed.get(product.id) ?? 0) + item.quantity);
    }
  }

  for (const item of comboItems) {
    const snapshot = item.comboSnapshot as { items?: { productId: string; quantity: number }[] } | null;
    for (const line of snapshot?.items ?? []) {
      needed.set(line.productId, (needed.get(line.productId) ?? 0) + line.quantity * item.quantity);
    }
  }

  if (needed.size === 0) return [];

  const products = await tx.product.findMany({
    where: { id: { in: [...needed.keys()] } },
    select: { id: true, stock: true, reservedStock: true, minimumStock: true },
  });

  return products.map((product) => ({
    id: product.id,
    needed: needed.get(product.id) as number,
    stock: product.stock,
    reservedStock: product.reservedStock,
    minimumStock: product.minimumStock,
  }));
}

// Convierte la reserva en descuento definitivo de stock cuando el pago
// queda aprobado.
async function confirmOrderStock(tx: Prisma.TransactionClient, orderId: string, items: OrderStockItem[]) {
  const needs = await computeOrderStockNeeds(tx, items);

  for (const need of needs) {
    const deductedQuantity = Math.min(need.stock, need.needed);
    const nextStock = Math.max(need.stock - need.needed, 0);
    const nextReservedStock = Math.max(need.reservedStock - need.needed, 0);

    await tx.product.update({
      where: { id: need.id },
      data: {
        stock: nextStock,
        reservedStock: nextReservedStock,
        availability: computeAvailability(nextStock, nextReservedStock, need.minimumStock),
        ...(deductedQuantity > 0
          ? {
              inventoryMovements: {
                create: {
                  type: "ORDER_DEDUCTION",
                  quantity: -deductedQuantity,
                  stockAfter: nextStock,
                  note: `Descuento automático por pedido ${orderId} (pago confirmado)`,
                },
              },
            }
          : {}),
      },
    });
  }
}

// Libera una reserva de stock sin tocar el stock real: pago rechazado o
// pedido expirado sin completar el pago.
async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: OrderStockItem[],
  reason: string,
) {
  const needs = await computeOrderStockNeeds(tx, items);

  for (const need of needs) {
    const nextReservedStock = Math.max(need.reservedStock - need.needed, 0);

    await tx.product.update({
      where: { id: need.id },
      data: {
        reservedStock: nextReservedStock,
        availability: computeAvailability(need.stock, nextReservedStock, need.minimumStock),
        inventoryMovements: {
          create: {
            type: "RELEASED",
            quantity: need.needed,
            stockAfter: need.stock,
            note: `Reserva liberada (${reason}) para pedido ${orderId}`,
          },
        },
      },
    });
  }
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
  const shippingOverride = getShippingOverride(
    cartItems.map((item) => ({ sku: item.sku ?? undefined, cantidad: item.quantity })),
  );
  const shippingCost = shippingOverride ?? getShippingForLocation(department, city).price;

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
        reservedStock: true,
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

    const stockReservations = new Map<
      string,
      { id: string; stock: number; reservedStock: number; minimumStock: number; needed: number }
    >();

    for (const item of productCartItems) {
      const product = products.find((entry) => entry.slug === baseProductSlug(item.productId as string));
      if (!product) continue;
      const tracked = stockReservations.get(product.id) ?? {
        id: product.id,
        stock: product.stock,
        reservedStock: product.reservedStock,
        minimumStock: product.minimumStock,
        needed: 0,
      };
      tracked.needed += item.quantity;
      stockReservations.set(product.id, tracked);
    }

    for (const cartCombo of comboCartItems) {
      const combo = combos.find((c) => c.id === cartCombo.comboId);
      if (!combo || !combo.active) {
        throw new Error(`INSUFFICIENT_STOCK:${cartCombo.name}`);
      }

      for (const comboItem of combo.items) {
        const neededQuantity = comboItem.quantity * cartCombo.quantity;
        const tracked = stockReservations.get(comboItem.productId) ?? {
          id: comboItem.productId,
          stock: comboItem.product.stock,
          reservedStock: comboItem.product.reservedStock,
          minimumStock: comboItem.product.minimumStock,
          needed: 0,
        };
        tracked.needed += neededQuantity;
        stockReservations.set(comboItem.productId, tracked);
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
        shippingCost,
        totalItems,
        assignedSellerId,
        paymentExpiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000),
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

    // El stock no se descuenta al crear el pedido: solo se reserva
    // (Product.reservedStock) hasta que el pago quede aprobado. Si el pago
    // falla o expira, markOrderPaidByWompiReference/expireStaleOrders liberan
    // la reserva sin haber tocado nunca el stock real.
    for (const tracked of stockReservations.values()) {
      const nextReservedStock = tracked.reservedStock + tracked.needed;

      await tx.product.update({
        where: { id: tracked.id },
        data: {
          reservedStock: nextReservedStock,
          availability: computeAvailability(tracked.stock, nextReservedStock, tracked.minimumStock),
          inventoryMovements: {
            create: {
              type: "RESERVED",
              quantity: tracked.needed,
              stockAfter: tracked.stock,
              note: `Reserva por pedido ${createdOrder.id} (pendiente de pago)`,
            },
          },
        },
      });
    }

    // El carrito se limpia solo cuando el pago quede confirmado (ver
    // markOrderPaidByWompiReference), no al crear el pedido: si el pago
    // se rechaza o se abandona en Wompi, el usuario no debe perder su carrito.

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

export async function setOrderWompiReference(orderId: string, userId: string) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      subtotal: true,
      shippingCost: true,
      customerEmail: true,
      wompiReference: true,
      paymentExpiresAt: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  // La referencia debe ser única por intento de pago para Wompi.
  const reference = `${order.id}-${Date.now()}`;

  await prisma.order.update({
    where: { id: orderId },
    data: { wompiReference: reference },
  });

  return { ...order, wompiReference: reference };
}

export async function markOrderPaidByWompiReference(
  reference: string,
  transactionId: string,
  status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR",
) {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const order = await prisma.order.findUnique({
    where: { wompiReference: reference },
    include: { items: true },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.paymentStatus === "PAID") {
    return order;
  }

  if (status !== "APPROVED") {
    // Pago ya marcado FAILED/EXPIRED antes (reintento del webhook): la
    // reserva ya fue liberada, no liberar dos veces.
    if (order.paymentStatus !== "PENDING") {
      return order;
    }

    await prisma.$transaction(async (tx) => {
      await releaseOrderStock(tx, order.id, order.items, "pago rechazado");
      await tx.order.update({
        where: { id: order.id },
        data: { wompiTransactionId: transactionId, paymentStatus: "FAILED" },
      });
    });
    return order;
  }

  if (order.paymentStatus !== "PENDING") {
    // Pago aprobado tarde: la reserva ya se había liberado (expiró o fue
    // rechazada antes). Se honra igual el pago y se descuenta stock fresco
    // -- nunca se le niega el pedido a alguien que sí pagó -- pero queda
    // este log porque es un caso raro que vale la pena que ops revise.
    console.warn("WOMPI_LATE_APPROVAL_AFTER", order.paymentStatus, order.id);
  }

  await prisma.$transaction(async (tx) => {
    await confirmOrderStock(tx, order.id, order.items);
    await tx.order.update({
      where: { id: order.id },
      data: {
        wompiTransactionId: transactionId,
        paymentStatus: "PAID",
        status: "PAID",
        shippingStatus: order.shippingStatus === "PENDING" ? "PREPARING" : order.shippingStatus,
      },
    });
  });

  await prisma.cartItem.deleteMany({ where: { userId: order.userId } });

  await earnPointsForOrder(order.userId, order.subtotal, order.id).catch(() => {});

  revalidateTag(DASHBOARD_STATS_TAG, "max");

  return await syncOrderToOdoo(order.id);
}

// Cron: libera la reserva de stock de los pedidos ONLINE que nunca
// completaron el pago dentro de la ventana (paymentExpiresAt vencido).
export async function expireStaleOrders() {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const staleOrders = await prisma.order.findMany({
    where: {
      channel: "ONLINE",
      paymentStatus: "PENDING",
      paymentExpiresAt: { lt: new Date() },
    },
    include: { items: true },
  });

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx) => {
      await releaseOrderStock(tx, order.id, order.items, "pago expirado");
      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: "EXPIRED", status: "CANCELLED" },
      });
    });
  }

  return { expiredCount: staleOrders.length, orderIds: staleOrders.map((order) => order.id) };
}

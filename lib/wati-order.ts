import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const COMBO_NAME = "Combo Premium";
const COMBO_PRICE = 309900;
const COMBO_SKU = "COMBO-PREMIUM-WATI";
const WATI_SYSTEM_USER_EMAIL = "whatsapp-ia@kliniu.com";

async function getWatiSystemUserId() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const existing = await prisma.user.findUnique({ where: { email: WATI_SYSTEM_USER_EMAIL } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      fullName: "Vendedor IA WhatsApp",
      email: WATI_SYSTEM_USER_EMAIL,
      passwordHash: crypto.randomBytes(32).toString("hex"),
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });
  return created.id;
}

export async function createWatiOrder(input: {
  customerName: string;
  customerPhone: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  quantity: number;
}) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (input.quantity < 1) throw new Error("INVALID_QUANTITY");

  const userId = await getWatiSystemUserId();
  const subtotal = COMBO_PRICE * input.quantity;
  const shippingCost = 0;
  const totalItems = input.quantity;

  const order = await prisma.order.create({
    data: {
      userId,
      channel: "WHATSAPP",
      customerName: input.customerName,
      customerEmail: WATI_SYSTEM_USER_EMAIL,
      customerPhone: input.customerPhone,
      department: "",
      city: input.city,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2?.trim() || null,
      notes: "Pedido generado por el asistente de WhatsApp. Pago contra entrega.",
      subtotal,
      shippingCost,
      totalItems,
      items: {
        create: [
          {
            name: COMBO_NAME,
            image: "",
            unitPrice: COMBO_PRICE,
            quantity: input.quantity,
            lineTotal: subtotal,
            sku: COMBO_SKU,
          },
        ],
      },
    },
  });

  return { orderId: order.id };
}

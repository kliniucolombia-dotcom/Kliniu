import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getShippingForLocation } from "@/lib/shipping-rates";
import { buildWompiCheckoutUrl } from "@/lib/wompi";

const COMBO_NAME = "Combo Total";
const COMBO_PRICE = 309900;
const COMBO_SKU = "COMBO-TOTAL-WATI";
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
  quantity: number;
}) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (input.quantity < 1) throw new Error("INVALID_QUANTITY");

  const userId = await getWatiSystemUserId();
  const subtotal = COMBO_PRICE * input.quantity;
  const shippingCost = getShippingForLocation("", input.city).price;
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

  const reference = `${order.id}-${Date.now()}`;
  await prisma.order.update({ where: { id: order.id }, data: { wompiReference: reference } });

  const paymentUrl = buildWompiCheckoutUrl({
    reference,
    amountInCents: (subtotal + shippingCost) * 100,
    redirectUrl: "https://kliniu.vercel.app/mi-cuenta",
    customerEmail: input.customerPhone + "@wati.kliniu.com",
  });

  return { orderId: order.id, paymentUrl };
}

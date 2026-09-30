import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ciudadesPorDepartamento } from "@/lib/colombia-locations";
import { getShippingForLocation, getShippingOverride } from "@/lib/shipping-rates";

const WATI_SYSTEM_USER_EMAIL = "whatsapp-ia@kliniu.com";

// Combo Premium promocional de WhatsApp: no existe como Product/Combo en la
// base, se resuelve como línea especial y Odoo la mapea por SKU
// (ver findOdooProductId en lib/odoo.ts).
const COMBO_PREMIUM = {
  slug: "combo-premium",
  name: "Combo Premium",
  price: 309900,
  sku: "COMBO-PREMIUM-WATI",
  image: "/whatsapp/combo-premium-kliniu.jpg",
};

export type WatiOrderLineInput = { slug: string; quantity: number };

export type CreateWatiOrderInput = {
  customerName: string;
  customerPhone: string;
  city: string;
  department?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  notes?: string | null;
  items: WatiOrderLineInput[];
};

function resolveDepartment(city: string, explicit?: string | null) {
  if (explicit?.trim()) return explicit.trim();

  const normalized = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  for (const [department, cities] of Object.entries(ciudadesPorDepartamento)) {
    if (
      cities.some(
        (candidate) =>
          candidate
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase() === normalized,
      )
    ) {
      return department;
    }
  }
  return "";
}

async function getWatiSystemUserId(db: Prisma.TransactionClient) {
  const existing = await db.user.findUnique({ where: { email: WATI_SYSTEM_USER_EMAIL } });
  if (existing) return existing.id;

  const created = await db.user.create({
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

export async function createWatiOrder(
  input: CreateWatiOrderInput,
  client?: Prisma.TransactionClient,
) {
  const db = client ?? prisma;
  if (!db) throw new Error("DATABASE_NOT_CONFIGURED");
  if (input.items.length === 0) throw new Error("EMPTY_ORDER");

  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  const city = input.city.trim();
  const addressLine1 = input.addressLine1.trim();
  if (!customerName || !customerPhone || !city || !addressLine1) {
    throw new Error("INVALID_ORDER");
  }

  const requested = input.items
    .map((item) => ({ slug: item.slug.trim(), quantity: Math.max(1, Math.floor(item.quantity)) }))
    .filter((item) => item.slug);

  const productSlugs = requested
    .map((item) => item.slug)
    .filter((slug) => slug !== COMBO_PREMIUM.slug);

  const userId = await getWatiSystemUserId(db);

  const products = await db.product.findMany({
    where: { slug: { in: productSlugs }, active: true },
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      image: true,
      price: true,
    },
  });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));

  const combos = productSlugs.length > 0
    ? await db.combo.findMany({
        where: { slug: { in: productSlugs }, active: true },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
      })
    : [];
  const combosBySlug = new Map(combos.map((combo) => [combo.slug, combo]));

  const orderLines = requested.map((item) => {
    if (item.slug === COMBO_PREMIUM.slug) {
      return {
        productId: null as string | null,
        comboId: null as string | null,
        comboSnapshot: undefined,
        name: COMBO_PREMIUM.name,
        image: COMBO_PREMIUM.image,
        unitPrice: COMBO_PREMIUM.price,
        sku: COMBO_PREMIUM.sku,
        quantity: item.quantity,
      };
    }

    const product = productsBySlug.get(item.slug);
    if (product) {
      return {
        productId: product.id,
        comboId: null as string | null,
        comboSnapshot: undefined,
        name: product.name,
        image: product.image,
        unitPrice: product.price,
        sku: product.sku,
        quantity: item.quantity,
      };
    }

    const combo = combosBySlug.get(item.slug);
    if (combo) {
      return {
        productId: null as string | null,
        comboId: combo.id,
        comboSnapshot: {
          name: combo.name,
          sku: combo.sku,
          price: combo.price,
          items: combo.items.map((ci) => ({
            productId: ci.productId,
            name: ci.product.name,
            quantity: ci.quantity,
          })),
        },
        name: combo.name,
        image: combo.image ?? "",
        unitPrice: combo.price,
        sku: combo.sku,
        quantity: item.quantity,
      };
    }

    throw new Error(`PRODUCT_NOT_FOUND:${item.slug}`);
  });

  const subtotal = orderLines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const totalItems = orderLines.reduce((total, line) => total + line.quantity, 0);
  const department = resolveDepartment(city, input.department);
  const shippingOverride = getShippingOverride(
    orderLines.map((line) => ({ sku: line.sku ?? undefined, cantidad: line.quantity })),
  );
  const shippingCost = shippingOverride ?? getShippingForLocation(department, city).price;

  const order = await db.order.create({
    data: {
      userId,
      channel: "WHATSAPP",
      customerName,
      customerEmail: WATI_SYSTEM_USER_EMAIL,
      customerPhone,
      department,
      city,
      addressLine1,
      addressLine2: input.addressLine2?.trim() || null,
      notes: input.notes?.trim() || "Pedido generado por el asistente de WhatsApp.",
      subtotal,
      shippingCost,
      totalItems,
      items: {
        create: orderLines.map((line) => ({
          productId: line.productId,
          comboId: line.comboId,
          comboSnapshot: line.comboSnapshot,
          name: line.name,
          image: line.image,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          lineTotal: line.unitPrice * line.quantity,
          sku: line.sku,
        })),
      },
    },
  });

  return {
    orderId: order.id,
    subtotal,
    shippingCost,
    totalItems,
    items: orderLines.map((line) => ({ name: line.name, quantity: line.quantity })),
  };
}

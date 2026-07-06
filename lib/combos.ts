import { prisma } from "@/lib/prisma";
import { slugify } from "@/app/data/catalog";

export type ComboItemInput = {
  productId: string;
  quantity: number;
};

export type ComboInput = {
  name: string;
  description?: string | null;
  image?: string | null;
  price: number;
  active?: boolean;
  items: ComboItemInput[];
};

async function generateUniqueSlugAndSku(name: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.combo.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const skuBase = `COMBO-${base.toUpperCase().replace(/-/g, "")}`.slice(0, 40);
  let sku = skuBase;
  let m = 1;
  while (await prisma.combo.findUnique({ where: { sku } })) {
    m += 1;
    sku = `${skuBase}-${m}`;
  }

  return { slug, sku };
}

export async function getCombosForPanel() {
  if (!prisma) return [];
  return prisma.combo.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { id: true, name: true, price: true, image: true } } } } },
  });
}

export async function getActiveCombos() {
  if (!prisma) return [];
  return prisma.combo.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { id: true, name: true, price: true, image: true } } } } },
  });
}

export async function getComboById(id: string) {
  if (!prisma) return null;
  return prisma.combo.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
}

export async function createCombo(input: ComboInput) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (input.items.length === 0) throw new Error("COMBO_WITHOUT_ITEMS");

  const { slug, sku } = await generateUniqueSlugAndSku(input.name);

  return prisma.combo.create({
    data: {
      slug,
      sku,
      name: input.name,
      description: input.description ?? null,
      image: input.image ?? null,
      price: input.price,
      active: input.active ?? true,
      items: {
        create: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      },
    },
    include: { items: { include: { product: true } } },
  });
}

export async function updateCombo(id: string, input: Partial<ComboInput>) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  return prisma.$transaction(async (tx) => {
    if (input.items) {
      if (input.items.length === 0) throw new Error("COMBO_WITHOUT_ITEMS");
      await tx.comboItem.deleteMany({ where: { comboId: id } });
      await tx.comboItem.createMany({
        data: input.items.map((item) => ({ comboId: id, productId: item.productId, quantity: item.quantity })),
      });
    }

    return tx.combo.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.image !== undefined ? { image: input.image } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: { items: { include: { product: true } } },
    });
  });
}

export async function deleteCombo(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.combo.delete({ where: { id } });
}

export function computeComboSavings(normalTotal: number, comboPrice: number) {
  const savings = Math.max(0, normalTotal - comboPrice);
  const savingsPct = normalTotal > 0 ? (savings / normalTotal) * 100 : 0;
  return { normalTotal, comboPrice, savings, savingsPct };
}

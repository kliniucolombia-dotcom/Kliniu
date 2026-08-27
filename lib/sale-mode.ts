import { prisma } from "@/lib/prisma";

export type SaleMode = "cart" | "whatsapp";

const KEY = "sale_mode";

export async function getSaleMode(): Promise<SaleMode> {
  if (!prisma) return "cart";
  const row = await prisma.appConfig.findUnique({ where: { key: KEY } });
  return row?.value === "whatsapp" ? "whatsapp" : "cart";
}

export async function setSaleMode(mode: SaleMode) {
  if (!prisma) return;
  await prisma.appConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: mode },
    update: { value: mode },
  });
}

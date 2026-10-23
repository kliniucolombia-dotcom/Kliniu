import { prisma } from "@/lib/prisma";
import type { CountryWhatsapp } from "@/lib/whatsapp-countries";

export { WHATSAPP_COUNTRIES, type CountryWhatsapp } from "@/lib/whatsapp-countries";

const KEY = "whatsapp_por_pais";
const EMPTY: CountryWhatsapp = { HN: "", GT: "", NI: "" };

export async function getCountryWhatsapp(): Promise<CountryWhatsapp> {
  if (!prisma) return EMPTY;
  const row = await prisma.appConfig.findUnique({ where: { key: KEY } });
  try {
    return { ...EMPTY, ...(row ? JSON.parse(row.value) : {}) };
  } catch {
    return EMPTY;
  }
}

export async function setCountryWhatsapp(value: CountryWhatsapp) {
  if (!prisma) return;
  const json = JSON.stringify(value);
  await prisma.appConfig.upsert({
    where: { key: KEY },
    create: { key: KEY, value: json },
    update: { value: json },
  });
}

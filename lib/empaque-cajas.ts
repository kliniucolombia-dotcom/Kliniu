import { prisma } from "@/lib/prisma";

// Medidas de las cajas de bodega, editables desde /panel/empaque. Viven en AppConfig (sin tabla propia).
export type Caja = { id: string; nombre: string; largoCm: number; anchoCm: number; altoCm: number; pesoKg: number | null };

const KEY = "empaque_cajas";

export async function getCajas(): Promise<Caja[]> {
  if (!prisma) return [];
  const row = await prisma.appConfig.findUnique({ where: { key: KEY } });
  try {
    const parsed = row ? JSON.parse(row.value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function num(v: unknown, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Valida y guarda la lista completa. Devuelve null si algún dato no sirve. */
export async function setCajas(input: unknown): Promise<Caja[] | null> {
  if (!prisma || !Array.isArray(input) || input.length > 50) return null;
  const cajas: Caja[] = [];
  for (const raw of input as Record<string, unknown>[]) {
    const nombre = String(raw?.nombre ?? "").trim().slice(0, 60);
    const largoCm = num(raw?.largoCm, 1, 500);
    const anchoCm = num(raw?.anchoCm, 1, 500);
    const altoCm = num(raw?.altoCm, 1, 500);
    const sinPeso = raw?.pesoKg == null || raw?.pesoKg === ""; // el peso es opcional: cambia según lo que lleve
    const pesoKg = sinPeso ? null : num(raw.pesoKg, 0.1, 1000);
    if (!nombre || largoCm === null || anchoCm === null || altoCm === null || (!sinPeso && pesoKg === null)) return null;
    const id = typeof raw?.id === "string" && raw.id ? raw.id.slice(0, 40) : crypto.randomUUID();
    cajas.push({ id, nombre, largoCm, anchoCm, altoCm, pesoKg });
  }
  const value = JSON.stringify(cajas);
  await prisma.appConfig.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
  return cajas;
}

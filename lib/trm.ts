// TRM (COP por USD). Fuente histórica oficial: datos.gov.co.
// Cacheado por fecha para no repetir llamadas dentro de una misma instancia.

const FALLBACK_TRM = 4000;
const TRM_DATASET = "https://www.datos.gov.co/resource/32sa-8pi3.json";

const cache = new Map<string, number>();

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchHistoricalTrm(key: string): Promise<number | null> {
  const where = `vigenciahasta>='${key}T00:00:00.000' AND vigenciadesde<='${key}T23:59:59.999'`;
  const url = `${TRM_DATASET}?$where=${encodeURIComponent(where)}&$limit=1&$order=${encodeURIComponent("vigenciadesde DESC")}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    const rate = parseFloat(data?.[0]?.valor);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchLatestTrm(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 3600 } });
    const data = await res.json();
    const rate = data?.rates?.COP;
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch {
    return null;
  }
}

/** TRM vigente para una fecha (usa la más reciente disponible si no hay dato exacto). */
export async function getTrmForDate(date: Date | string): Promise<number> {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return FALLBACK_TRM;

  const key = dateKey(d);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let rate = await fetchHistoricalTrm(key);
  if (!rate) rate = await fetchLatestTrm();
  if (!rate) rate = FALLBACK_TRM;

  cache.set(key, rate);
  return rate;
}

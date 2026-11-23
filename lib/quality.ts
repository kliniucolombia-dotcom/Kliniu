import { prisma } from "@/lib/prisma";
import type { QualityStatus } from "@/generated/prisma/client";
import { endOfBogotaDay, parseBogotaDate } from "@/lib/logistics";
import { normalizeAttachments } from "@/lib/maintenance-upload";
import { isRecord } from "@/lib/operations-validation";

/** Meta de calidad: máximo 2% de unidades defectuosas sobre lo despachado. */
export const QUALITY_TARGET_PCT = 2;
export const QUALITY_STATUSES: QualityStatus[] = ["CASE", "CONFIRMED", "PROPOSED_ACTION"];

const db = () => {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
};

export const defectPct = (defective: number, dispatched: number) => (dispatched > 0 ? (defective / dispatched) * 100 : 0);

const text = (v: unknown, max = 2000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const qty = (v: unknown) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) throw new Error("INVALID_NUMBER");
  return v;
};

export function parseCaseInput(raw: unknown, partial = false) {
  if (!isRecord(raw)) throw new Error("INVALID_BODY");
  const out: Record<string, unknown> = {};
  for (const k of ["deliveryNote", "lotNumber", "city"] as const) {
    if (k in raw || !partial) {
      const v = text(raw[k], 120);
      if (!v) throw new Error("MISSING_FIELD");
      out[k] = v;
    }
  }
  if ("dispatchedQty" in raw || !partial) out.dispatchedQty = qty(raw.dispatchedQty);
  if ("defectiveQty" in raw || !partial) out.defectiveQty = qty(raw.defectiveQty);
  if ("photos" in raw || !partial) {
    const photos = normalizeAttachments(raw.photos);
    if (photos.length === 0) throw new Error("MISSING_FIELD");
    out.photos = photos;
  }
  for (const k of ["analysis", "diagnosis", "followUp", "solution"] as const) {
    if (k in raw || !partial) {
      const v = text(raw[k]);
      if (!v) throw new Error("MISSING_FIELD");
      out[k] = v;
    }
  }
  if ("status" in raw && QUALITY_STATUSES.includes(raw.status as QualityStatus)) out.status = raw.status;
  return out;
}

export function assertQuantities(dispatched: number, defective: number) {
  if (dispatched <= 0 || defective > dispatched) throw new Error("INVALID_QUANTITIES");
}

export const QUALITY_ERRORS: Record<string, string> = {
  INVALID_BODY: "Datos inválidos",
  MISSING_FIELD: "Todos los campos son obligatorios (incluye al menos una foto)",
  INVALID_NUMBER: "Las cantidades deben ser enteros positivos",
  INVALID_QUANTITIES: "La cantidad defectuosa no puede superar la despachada (y la despachada debe ser mayor a 0)",
};

const include = { createdBy: { select: { id: true, fullName: true } } } as const;

export const listCases = () => db().qualityCase.findMany({ orderBy: { createdAt: "desc" }, include, take: 500 });
export const createCase = (data: Record<string, unknown>, createdById: string) =>
  db().qualityCase.create({ data: { ...data, createdById } as never, include });
export const updateCase = (id: string, data: Record<string, unknown>) =>
  db().qualityCase.update({ where: { id }, data: data as never, include });
export const deleteCase = (id: string) => db().qualityCase.delete({ where: { id } });
export const getCase = (id: string) => db().qualityCase.findUnique({ where: { id } });

/** KPIs del período (from/to = YYYY-MM-DD, hora Bogotá) para el informe. */
export async function getQualityKpis(from: string, to: string) {
  const rows = await db().qualityCase.findMany({
    where: { createdAt: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    select: { dispatchedQty: true, defectiveQty: true },
  });
  const dispatched = rows.reduce((t, r) => t + r.dispatchedQty, 0);
  const defective = rows.reduce((t, r) => t + r.defectiveQty, 0);
  return {
    cases: rows.length,
    dispatched,
    defective,
    defectPct: Math.round(defectPct(defective, dispatched) * 100) / 100,
    overTarget: rows.filter((r) => defectPct(r.defectiveQty, r.dispatchedQty) > QUALITY_TARGET_PCT).length,
  };
}

import { prisma } from "@/lib/prisma";
import { parseBogotaDate } from "@/lib/logistics";
import { isRecord } from "@/lib/operations-validation";
import { normalizeAttachments } from "@/lib/maintenance-upload";

/** Único firmante de la liberación: Cristian Beltrán (ingeniero / jefe de operaciones). */
export const QUALITY_SIGNER_EMAIL = "jefeoperaciones@kliniu.com";

/** Criterios del formato en papel, en el mismo orden. */
export const INSPECTION_CHECKS = [
  "color", "forma", "transparencia", "fisuras", "soldadura", "acople", "succion", "sellado", "etiqueta",
] as const;
const CHECK_VALUES = ["C", "N", "NA"];

const db = () => {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
};

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown, min: number) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < min) throw new Error("INVALID_NUMBER");
  return v;
};

export function parseInspectionInput(raw: unknown) {
  if (!isRecord(raw)) throw new Error("INVALID_BODY");
  const date = typeof raw.inspectedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.inspectedOn) ? raw.inspectedOn : null;
  const productRef = text(raw.productRef, 160);
  const lotNumber = text(raw.lotNumber, 60);
  const sampleRange = text(raw.sampleRange, 60);
  if (!date || !productRef || !lotNumber || !sampleRange) throw new Error("MISSING_FIELD");
  const lotQty = int(raw.lotQty, 1);
  const sampleSize = int(raw.sampleSize, 1);
  const nonConforming = int(raw.nonConforming, 0);
  if (sampleSize > lotQty || nonConforming > sampleSize) throw new Error("INVALID_QUANTITIES");
  const checksRaw = isRecord(raw.checks) ? raw.checks : {};
  const checks: Record<string, string> = {};
  for (const k of INSPECTION_CHECKS) {
    if (!CHECK_VALUES.includes(checksRaw[k] as string)) throw new Error("MISSING_CHECK");
    checks[k] = checksRaw[k] as string;
  }
  if (typeof raw.lotConforming !== "boolean") throw new Error("MISSING_FIELD");
  const action = text(raw.action, 1000);
  if (!raw.lotConforming && !action) throw new Error("MISSING_ACTION");
  return {
    inspectedOn: parseBogotaDate(date), productRef, lotNumber, lotQty, sampleSize, sampleRange,
    checks, nonConforming, lotConforming: raw.lotConforming, action, attachments: normalizeAttachments(raw.attachments),
  };
}

export const INSPECTION_ERRORS: Record<string, string> = {
  INVALID_BODY: "Datos inválidos",
  MISSING_FIELD: "Completa fecha, referencia, lote, consecutivo y conformidad del lote",
  INVALID_NUMBER: "Las cantidades deben ser enteros (piezas y muestra mayores a 0)",
  INVALID_QUANTITIES: "La muestra no puede superar las piezas del lote, ni los no conformes la muestra",
  INVALID_DATE: "Fecha inválida",
  MISSING_CHECK: "Marca C, N o N/A en todos los criterios",
  MISSING_ACTION: "Si el lote no es conforme, describe la acción sobre el producto no conforme",
  INVALID_SIGNATURE: "Dibuja la firma antes de liberar",
  ALREADY_SIGNED: "El lote ya está firmado y no se puede modificar",
  STALE: "El registro cambió mientras lo revisabas. Vuelve a abrirlo y firma de nuevo",
  NOT_SIGNER: "Solo el ingeniero puede firmar la liberación",
};

const include = {
  createdBy: { select: { fullName: true } },
  signedBy: { select: { fullName: true } },
} as const;

export const listInspections = () => db().qualityInspection.findMany({ orderBy: [{ inspectedOn: "desc" }, { createdAt: "desc" }], include, take: 500 });
export const getInspection = (id: string) => db().qualityInspection.findUnique({ where: { id } });
export const createInspection = (data: ReturnType<typeof parseInspectionInput>, createdById: string) =>
  db().qualityInspection.create({ data: { ...data, createdById }, include });
export const updateInspection = (id: string, data: ReturnType<typeof parseInspectionInput>) =>
  db().qualityInspection.update({ where: { id, signedAt: null }, data, include });
export const deleteInspection = (id: string) => db().qualityInspection.delete({ where: { id, signedAt: null } });

/** Firma solo la versión que el ingeniero vio: si alguien editó el lote después, no matchea (P2025 → STALE). */
export function signInspection(id: string, signerId: string, signatureData: unknown, seenUpdatedAt: unknown) {
  const seen = typeof seenUpdatedAt === "string" ? new Date(seenUpdatedAt) : null;
  if (!seen || Number.isNaN(seen.getTime())) throw new Error("STALE");
  // PNG del SignaturePad; ~300 KB es de sobra para un trazo.
  if (typeof signatureData !== "string" || !signatureData.startsWith("data:image/png;base64,") || signatureData.length > 300_000) {
    throw new Error("INVALID_SIGNATURE");
  }
  return db().qualityInspection.update({
    where: { id, signedAt: null, updatedAt: seen },
    data: { signatureData, signedById: signerId, signedAt: new Date() },
    include,
  });
}

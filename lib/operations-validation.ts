const CIVIL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBogotaCivilDate(value: unknown): Date {
  if (typeof value !== "string") throw new Error("INVALID_DATE");
  const match = CIVIL_DATE_RE.exec(value);
  if (!match) throw new Error("INVALID_DATE");

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new Error("INVALID_DATE");
  }

  const parsed = new Date(`${value}T00:00:00-05:00`);
  if (!Number.isFinite(parsed.getTime())) throw new Error("INVALID_DATE");
  return parsed;
}

export function parseIsoDateTime(value: unknown): Date {
  if (typeof value !== "string" || value.trim() === "") throw new Error("INVALID_DATETIME");
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("INVALID_DATETIME");
  return parsed;
}

export function parsePositiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new Error("INVALID_NUMBER");
  }
  return value;
}

export function parseNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("INVALID_NUMBER");
  }
  return value;
}

import type { MaintenanceStatus } from "@/generated/prisma/client";

export function nextMaintenanceNumber(last: string | null): string {
  const current = last ? Number.parseInt(last.replace(/\D/g, ""), 10) || 0 : 0;
  return `MT-${String(current + 1).padStart(4, "0")}`;
}

export function assertMaintenanceTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
  const valid = (from === "PENDING" && (to === "IN_PROGRESS" || to === "CANCELLED")) ||
    (from === "IN_PROGRESS" && (to === "DONE" || to === "CANCELLED"));
  if (!valid) throw new Error("INVALID_TRANSITION");
}

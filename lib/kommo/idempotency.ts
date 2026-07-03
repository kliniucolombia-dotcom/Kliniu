import { prisma } from "@/lib/prisma";
import type { KommoSyncOperation } from "./types";

/**
 * Returns the Kommo entity ID for a previously successful sync operation.
 * If found, the caller should skip the API call and reuse the existing Kommo ID.
 */
export async function getExistingKommoId(
  entityId: string,
  operation: KommoSyncOperation,
): Promise<number | null> {
  if (!prisma) return null;

  const record = await prisma.kommoSyncLog.findFirst({
    where: { entityId, operation, status: "SUCCESS", kommoId: { not: null } },
    select: { kommoId: true },
    orderBy: { syncedAt: "desc" },
  });

  return record?.kommoId ?? null;
}

/**
 * Records the Kommo ID for a completed sync operation.
 * Called after a successful create/update to enable future idempotency checks.
 */
export async function recordSuccessfulSync(
  jobId: string,
  kommoId: number,
): Promise<void> {
  if (!prisma) return;

  await prisma.kommoSyncLog.update({
    where: { id: jobId },
    data: { kommoId, status: "SUCCESS", syncedAt: new Date(), error: null },
  });
}

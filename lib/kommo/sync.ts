import { prisma } from "@/lib/prisma";
import { findOrCreateContact } from "./contacts";
import { findOrCreateDeal } from "./leads";
import { addNote } from "./messages";
import { mapOrderToNote } from "./mappers";
import { recordSuccessfulSync } from "./idempotency";
import type { KommoSyncJobInput, KommoSyncOperation } from "./types";
import type { UserInput } from "./mappers";
import type { OrderInput } from "./mappers";

const MAX_RETRIES = 3;

export async function enqueueSyncJob(input: KommoSyncJobInput): Promise<string | null> {
  if (!prisma) return null;

  const job = await prisma.kommoSyncLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      payload: (input.payload ?? null) as never,
      status: "PENDING",
    },
  });

  // Fire-and-forget — does not block the caller
  // Replace this with a real queue (Vercel Queues / Bull) in the future
  void processSyncJob(job.id).catch((err: unknown) => {
    console.error(`[kommo:sync] job ${job.id} failed:`, err instanceof Error ? err.message : err);
  });

  return job.id;
}

export async function processSyncJob(jobId: string): Promise<void> {
  if (!prisma) return;

  const job = await prisma.kommoSyncLog.findUnique({ where: { id: jobId } });
  if (!job || job.status === "SUCCESS" || job.status === "ABANDONED") return;

  await prisma.kommoSyncLog.update({
    where: { id: jobId },
    data: { status: "IN_PROGRESS", lastAttempt: new Date() },
  });

  try {
    const kommoId = await dispatchOperation(job.operation as KommoSyncOperation, job.payload as Record<string, unknown>);

    if (kommoId) {
      await recordSuccessfulSync(jobId, kommoId);
    } else {
      await prisma.kommoSyncLog.update({
        where: { id: jobId },
        data: { status: "SUCCESS", syncedAt: new Date(), error: null },
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const nextRetries = job.retries + 1;
    const abandoned = nextRetries >= MAX_RETRIES;

    await prisma.kommoSyncLog.update({
      where: { id: jobId },
      data: {
        status: abandoned ? "ABANDONED" : "FAILED",
        error: message,
        retries: nextRetries,
      },
    });

    if (!abandoned) throw err;
  }
}

async function dispatchOperation(
  operation: KommoSyncOperation,
  payload: Record<string, unknown>,
): Promise<number | null> {
  switch (operation) {
    case "create_contact": {
      const user = payload.user as UserInput;
      return findOrCreateContact(user);
    }
    case "create_deal": {
      const order = payload.order as OrderInput;
      const contactId = payload.contactId as number;
      return findOrCreateDeal(order, contactId);
    }
    case "add_note": {
      const order = payload.order as OrderInput;
      const dealId = payload.dealId as number;
      await addNote(dealId, mapOrderToNote(order));
      return null;
    }
    default:
      throw new Error(`KOMMO_SYNC: unsupported operation "${operation}"`);
  }
}

export async function retryFailedJobs(): Promise<void> {
  if (!prisma) return;

  const failed = await prisma.kommoSyncLog.findMany({
    where: { status: "FAILED", retries: { lt: MAX_RETRIES } },
    take: 20,
    orderBy: { lastAttempt: "asc" },
  });

  await Promise.allSettled(failed.map((job) => processSyncJob(job.id)));
}
